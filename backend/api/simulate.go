package api

import (
	"encoding/binary"
	"encoding/json"
	"net"
	"net/http"
)

type simReq struct {
	ID       *int `json:"id,omitempty"`        // plain number
	EntityID *int `json:"entity_id,omitempty"` // alias
	R        byte `json:"r"`
	G        byte `json:"g"`
	B        byte `json:"b"`
	W        byte `json:"w"`
}

// POST /api/simulate  → inject 6-byte packet into local UDP listener.
func simulateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(405)
		return
	}

	var req simReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad JSON", 400)
		return
	}

	// Resolve entity ID
	var id int
	switch {
	case req.ID != nil:
		id = *req.ID
	case req.EntityID != nil:
		id = *req.EntityID
	default:
		http.Error(w, "missing id/entity_id", 400)
		return
	}
	if id <= 0 || id > 65535 {
		http.Error(w, "id out of range (1-65535)", 400)
		return
	}

	// Build 6-byte eHuB frame
	var pkt [6]byte
	binary.BigEndian.PutUint16(pkt[0:2], uint16(id))
	pkt[2], pkt[3], pkt[4], pkt[5] = req.R, req.G, req.B, req.W

	conn, err := net.DialUDP("udp", nil,
		&net.UDPAddr{IP: net.IPv4(127, 0, 0, 1), Port: cfg.Port})
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer conn.Close()

	_, _ = conn.Write(pkt[:])
	w.WriteHeader(204)
}
