package api

import (
	"encoding/json"
	"net/http"

	"nolightnofun/metrics"
	"nolightnofun/models"
)

var cfg *models.Config

func Router(conf *models.Config) http.Handler {
	cfg = conf
	bindConfigPointer(conf)

	mux := http.NewServeMux()
	mux.HandleFunc("/api/ws", WebSocketHandler)
	mux.HandleFunc("/api/config", configHandler)
	mux.HandleFunc("/api/patchmap", patchMapHandler)
	mux.Handle("/metrics", metrics.Handler())
	return withCORS(mux)
}

func configHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		_ = json.NewEncoder(w).Encode(cfg)

	case http.MethodPost:
		var in models.Config
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			http.Error(w, "bad JSON", http.StatusBadRequest)
			return
		}
		*cfg = in
		w.WriteHeader(http.StatusNoContent)

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}
