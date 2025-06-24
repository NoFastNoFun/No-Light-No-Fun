package api

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	"nolightnofun/config"
	"nolightnofun/metrics"
	"nolightnofun/models"
)

/* --------------------------------------------------------------------- */
/* globals wired from main.go                                            */

var (
	cfg        *models.Config // live config (hot-swapped at runtime)
	configPath string         // absolute path to JSON on disk
	dispatcher *Dispatcher    // eHuB → Art-Net bridge (runs once)
)

/* --------------------------------------------------------------------- */
/* Router                                                                */

// Router wires every handler, starts the dispatcher and enables CORS.
func Router(conf *models.Config, persist string) http.Handler {
	cfg = conf           // live pointer shared with dispatcher
	configPath = persist // path used for SaveConfig / LoadConfig

	// sane default for incoming eHuB UDP port
	if cfg.Port == 0 {
		cfg.Port = 6455
	}

	// start bridge once; sees hot-swaps via cfg pointer
	dispatcher = NewDispatcher(cfg)
	go dispatcher.Run()

	// the helper you already had (keeps cfg pointer valid across packages)
	bindConfigPointer(conf)

	mux := http.NewServeMux()

	/* === PUBLIC API =================================================== */
	mux.HandleFunc("/api/simulate", simulateHandler) // (in simulate.go)
	mux.HandleFunc("/api/config", configHandler)     // GET, POST, PUT
	mux.HandleFunc("/api/patchmap", patchMapHandler) // unchanged
	mux.HandleFunc("/api/ws", WebSocketHandler)      // unchanged

	/* === PROMETHEUS =================================================== */
	mux.Handle("/metrics", metrics.Handler())

	/* === CORS / OPTIONS ============================================== */
	return withCORS(mux)
}

/* --------------------------------------------------------------------- */
/* /api/config : load / save complete system configuration               */

func configHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {

	/* ----- GET current live config ---------------------------------- */
	case http.MethodGet:
		_ = json.NewEncoder(w).Encode(cfg)
		return

	/* ----- POST / PUT : replace config ------------------------------ */
	case http.MethodPost, http.MethodPut:
		body, _ := io.ReadAll(r.Body)
		defer r.Body.Close()

		var dto incomingConfig
		if err := json.Unmarshal(body, &dto); err != nil {
			http.Error(w, "bad JSON: "+err.Error(), http.StatusBadRequest)
			return
		}

		newCfg, err := dto.ToModel()
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		*cfg = newCfg // hot-swap (dispatcher sees it)
		if err := config.SaveConfig(configPath, *cfg); err != nil {
			http.Error(w, "save: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusNoContent)
		return
	}

	w.WriteHeader(http.StatusMethodNotAllowed)
}

/* --------------------------------------------------------------------- */
/* JSON → model helpers                                                  */

type incomingMapping struct {
	EntityID     string `json:"entity_id"`
	IP           string `json:"controller_ip"`
	Universe     int    `json:"universe"`
	StartChannel int    `json:"channel_start"`
	ChannelCount int    `json:"channel_count"`
	UseR         bool   `json:"use_r"`
	UseG         bool   `json:"use_g"`
	UseB         bool   `json:"use_b"`
	UseW         bool   `json:"use_w"`
}

type incomingConfig struct {
	Mappings        []incomingMapping `json:"mappings"`
	Patches         []models.Patch    `json:"patches"`
	UDPPort         int               `json:"udp_port"`         // ignored (listener stays on cfg.Port)
	DefaultUniverse int               `json:"default_universe"` // reserved
	MaxFPS          int               `json:"max_fps"`
}

// ToModel converts the DTO coming from the UI to the internal models.Config.
func (c incomingConfig) ToModel() (models.Config, error) {
	var out models.Config

	/* ----- keep immutable fields ------------------------------------ */
	out.Port = cfg.Port                       // eHuB listener never moves
	out.DefaultUniverse = cfg.DefaultUniverse // reserved for future use

	/* ----- user-editable fields ------------------------------------- */
	out.MaxFPS = c.MaxFPS
	out.Patches = c.Patches

	/* ----- mappings -------------------------------------------------- */
	for _, m := range c.Mappings {
		cc := m.ChannelCount
		if cc == 0 { // auto-detect
			if m.UseW {
				cc = 4
			} else {
				cc = 3
			}
		}

		id, _ := strconv.Atoi(m.EntityID)
		out.Mappings = append(out.Mappings, models.Mapping{
			EntityID:     id,
			ControllerIP: m.IP,
			Universe:     m.Universe,
			ChannelStart: m.StartChannel,
			ChannelCount: cc,
			UseR:         m.UseR,
			UseG:         m.UseG,
			UseB:         m.UseB,
			UseW:         m.UseW,
		})
	}

	return out, nil
}
