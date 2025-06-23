package api

import (
	"encoding/json"
	"net/http"

	"nolightnofun/models"
)

var config models.Config

func Router() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/config", configHandler)
	return mux
}

func configHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		_ = json.NewEncoder(w).Encode(config)
	} else if r.Method == http.MethodPost {
		var newConfig models.Config
		err := json.NewDecoder(r.Body).Decode(&newConfig)
		if err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}
		config = newConfig
		w.WriteHeader(http.StatusOK)
	}
}
