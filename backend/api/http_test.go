package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"nolightnofun/models"
)

func TestConfigRoundTrip(t *testing.T) {
	tmp := t.TempDir() + "/c.json"
	cfg := models.Config{}
	h := Router(&cfg, tmp)

	// POST new config
	body := `{"mappings":[{"entityId":"1","ip":"10.0.0.2","universe":100,"startChannel":1,"flags":{"r":true,"g":true,"b":true,"w":false}}]}`
	req := httptest.NewRequest("POST", "/api/config", bytes.NewBufferString(body))
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	if w.Code != http.StatusNoContent {
		t.Fatalf("POST status %d", w.Code)
	}

	// GET should return same mapping
	req = httptest.NewRequest("GET", "/api/config", nil)
	w = httptest.NewRecorder()
	h.ServeHTTP(w, req)
	var got models.Config
	if err := json.NewDecoder(w.Body).Decode(&got); err != nil {
		t.Fatal(err)
	}
	if len(got.Mappings) != 1 || got.Mappings[0].ControllerIP != "10.0.0.2" {
		t.Fatalf("round-trip failed %+v", got.Mappings)
	}

	// file persisted?
	if _, err := os.Stat(tmp); err != nil {
		t.Fatalf("config not saved: %v", err)
	}
}
