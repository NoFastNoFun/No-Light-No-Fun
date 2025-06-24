package api

import (
	"encoding/json"
	"fmt"
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
	dispatcher *Dispatcher
)

/* --------------------------------------------------------------------- */
/* Router                                                                */

func Router(conf *models.Config, persist string) http.Handler {
	cfg = conf
	configPath = persist

	if cfg.Port == 0 {
		cfg.Port = 6455
	}

	dispatcher = NewDispatcher(cfg)
	go dispatcher.Run()

	bindConfigPointer(conf)

	mux := http.NewServeMux()
	mux.HandleFunc("/api/simulate", simulateHandler)
	mux.HandleFunc("/api/config", configHandler)
	mux.HandleFunc("/api/patchmap", patchMapHandler)
	mux.HandleFunc("/api/ws", WebSocketHandler)
	mux.Handle("/metrics", metrics.Handler())

	return withCORS(mux)
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
		*cfg = newCfg

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
	EntityID     json.RawMessage `json:"entity_id"` // accepts number or string
	IP           string          `json:"controller_ip"`
	Universe     int             `json:"universe"`
	StartChannel int             `json:"channel_start"`
	ChannelCount int             `json:"channel_count"`
	UseR         bool            `json:"use_r"`
	UseG         bool            `json:"use_g"`
	UseB         bool            `json:"use_b"`
	UseW         bool            `json:"use_w"`
}

type incomingConfig struct {
	Mappings        []incomingMapping `json:"mappings"`
	Patches         []models.Patch    `json:"patches"`
	UDPPort         int               `json:"udp_port"`
	DefaultUniverse int               `json:"default_universe"`
	MaxFPS          int               `json:"max_fps"`
}

func (c incomingConfig) ToModel() (models.Config, error) {
	var out models.Config
	out.MaxFPS = c.MaxFPS
	out.Patches = c.Patches
	out.Port = func() int {
		if c.UDPPort != 0 {
			return c.UDPPort
		}
		return cfg.Port
	}()
	out.DefaultUniverse = cfg.DefaultUniverse

	for _, m := range c.Mappings {
		id, err := rawJSONToInt(m.EntityID)
		if err != nil || id <= 0 {
			return models.Config{}, fmt.Errorf("invalid entity_id in mapping %+v", m)
		}

		cc := m.ChannelCount
		if cc == 0 {
			if m.UseW {
				cc = 4
			} else {
				cc = 3
			}
		}

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

/* --------------------------------------------------------------------- */
/* helpers                                                               */

// rawJSONToInt parses JSON number or quoted string into int.
func rawJSONToInt(raw json.RawMessage) (int, error) {
	var n int64
	if err := json.Unmarshal(raw, &n); err == nil {
		return int(n), nil
	}
	var s string
	if err := json.Unmarshal(raw, &s); err != nil {
		return 0, err
	}
	v, err := strconv.Atoi(s)
	return v, err
}
