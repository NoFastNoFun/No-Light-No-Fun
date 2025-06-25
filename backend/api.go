package main

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/gorilla/websocket"
)

/* ---------- REST ---------- */

func getConfig(w http.ResponseWriter, _ *http.Request) {
	cfgMu.RLock()
	defer cfgMu.RUnlock()
	_ = json.NewEncoder(w).Encode(cfg)
}

func putConfig(w http.ResponseWriter, r *http.Request) {
	var c Config
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		http.Error(w, err.Error(), 400)
		return
	}
	updater.applyConfig(c)
	cfgMu.Lock()
	cfg = c
	cfgMu.Unlock()
	w.WriteHeader(http.StatusNoContent)
}

func postPatchCSV(w http.ResponseWriter, r *http.Request) {
	patches, err := parsePatchCSV(r.Body)
	if err != nil {
		http.Error(w, err.Error(), 400)
		return
	}

	cfgMu.Lock()
	cfg.Patch = patches
	cfgMu.Unlock()

	updater.setPatch(patches)
	w.WriteHeader(http.StatusNoContent)
}

/* ---------- WebSockets ---------- */

var wsUpgrader = websocket.Upgrader{CheckOrigin: func(*http.Request) bool { return true }}

func wsEhub(w http.ResponseWriter, r *http.Request) {
	c, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer c.Close()
	sink := updater.addEhubSink()
	defer updater.removeEhubSink(sink)
	for msg := range sink {
		_ = c.WriteJSON(msg)
	}
}

func wsDMX(w http.ResponseWriter, r *http.Request) {
	c, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer c.Close()
	sink := updater.addDMXSink()
	defer updater.removeDMXSink(sink)
	for msg := range sink {
		_ = c.WriteMessage(websocket.BinaryMessage, msg)
	}
}

func wsArtIn(w http.ResponseWriter, r *http.Request) {
	c, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer c.Close()
	sink := addArtSink()
	defer removeArtSink(sink)
	for msg := range sink {
		_ = c.WriteMessage(websocket.BinaryMessage, msg)
	}
}

/* ---------- router builder ---------- */

func buildRouter() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.Logger, middleware.Recoverer)

	r.Get("/api/config", getConfig)
	r.Put("/api/config", putConfig)
	r.Post("/api/patch/csv", postPatchCSV)
	r.Post("/api/faker", postFaker)
	r.Delete("/api/faker", deleteFaker)
	r.Post("/api/stream", postStream) // NEW
	r.Delete("/api/stream", deleteStream)

	r.Get("/ws/ehub", wsEhub)
	r.Get("/ws/dmx", wsDMX)
	r.Get("/ws/artnet-in", wsArtIn)

	return r
}
