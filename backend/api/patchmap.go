package api

import (
	"encoding/json"
	"net/http"
	"nolightnofun/models"
)

func patchMapHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		_ = json.NewEncoder(w).Encode(configRef.Patches)

	case http.MethodPost:
		var in []models.Patch
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			http.Error(w, "bad JSON", 400)
			return
		}
		configRef.Patches = in
		w.WriteHeader(204)

	default:
		w.WriteHeader(405)
	}
}

// Helper shared by http.go
var configRef *models.Config

func bindConfigPointer(ptr *models.Config) { configRef = ptr }
