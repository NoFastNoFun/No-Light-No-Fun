package api

import (
	"encoding/json"
	"io"
	"net/http"

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

func Router(conf *models.Config, persist string) http.Handler {
	cfg = conf
	configPath = persist
	bindConfigPointer(conf)

	mux := http.NewServeMux()
	mux.HandleFunc("/api/ws", WebSocketHandler)
	mux.HandleFunc("/api/config", configHandler)
	mux.HandleFunc("/api/patchmap", patchMapHandler)
	mux.HandleFunc("/api/simulate", simulateHandler)
	mux.Handle("/metrics", metrics.Handler())
	return withCORS(mux) // add OPTIONS / CORS
}

/* --------------------------------------------------------------------- */
/* /api/config                                                           */

func configHandler(w http.ResponseWriter, r *http.Request) {

	switch r.Method {
	case http.MethodGet:
		_ = json.NewEncoder(w).Encode(cfg)

	case http.MethodPost:
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

		// persist to disk
		if err := config.SaveConfig(configPath, *cfg); err != nil {
			http.Error(w, "save: "+err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

/* --------------------------------------------------------------------- */
/* DTO → Model conversion                                                */

type incomingConfig struct {
	Mappings []struct {
		EntityID     string `json:"entityId"`
		IP           string `json:"ip"`
		Universe     int    `json:"universe"`
		StartChannel int    `json:"startChannel"`
		Flags        struct {
			R bool `json:"r"`
			G bool `json:"g"`
			B bool `json:"b"`
			W bool `json:"w"`
		} `json:"flags"`
	} `json:"mappings"`
	// Patches could arrive here later
}

func (c incomingConfig) ToModel() (models.Config, error) {
	var out models.Config
	for _, m := range c.Mappings {
		chCount := 3
		if m.Flags.W {
			chCount = 4
		}
		out.Mappings = append(out.Mappings, models.Mapping{
			EntityID:     m.EntityID, // string as-is
			ControllerIP: m.IP,
			Universe:     m.Universe,
			ChannelStart: m.StartChannel,
			ChannelCount: chCount,
			UseR:         m.Flags.R,
			UseG:         m.Flags.G,
			UseB:         m.Flags.B,
			UseW:         m.Flags.W,
		})
	}
	return out, nil
}

/* --------------------------------------------------------------------- */
