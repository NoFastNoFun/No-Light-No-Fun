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
	cfg        *models.Config
	configPath string
)

/* --------------------------------------------------------------------- */
/* router builder                                                        */

// Router wires all handlers and exposes /metrics for Prometheus.
func Router(conf *models.Config, persist string) http.Handler {
	cfg = conf
	configPath = persist
	bindConfigPointer(conf) // helper shared with patchmap.go

	mux := http.NewServeMux()
	mux.HandleFunc("/api/ws", WebSocketHandler)
	mux.HandleFunc("/api/config", configHandler)
	mux.HandleFunc("/api/patchmap", patchMapHandler)
	mux.HandleFunc("/api/simulate", simulateHandler)
	mux.Handle("/metrics", metrics.Handler())

	return withCORS(mux) // OPTIONS & permissive CORS
}

/* --------------------------------------------------------------------- */
/* /api/config                                                           */

func configHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {

	case http.MethodGet:
		_ = json.NewEncoder(w).Encode(cfg)
		return

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
		*cfg = newCfg // hot-swap live config

		// persist on disk
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
/* DTO → Model conversion                                                */

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
	UDPPort         int               `json:"udp_port"`         // ignored; UDP listener stays on 6455
	DefaultUniverse int               `json:"default_universe"` // reserved
	MaxFPS          int               `json:"max_fps"`
}

func (c incomingConfig) ToModel() (models.Config, error) {
	var out models.Config
	out.MaxFPS = c.MaxFPS
	out.Patches = c.Patches
	// keep existing listener port (6455 default) regardless of udp_port in JSON
	out.Port = cfg.Port
	out.DefaultUniverse = cfg.DefaultUniverse

	for _, m := range c.Mappings {
		cc := m.ChannelCount
		if cc == 0 {
			if m.UseW {
				cc = 4
			} else {
				cc = 3
			}
		}
		out.Mappings = append(out.Mappings, models.Mapping{
			EntityID: func() int {
				id, err := strconv.Atoi(m.EntityID)
				if err != nil {
					return 0
				}
				return id
			}(),
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
