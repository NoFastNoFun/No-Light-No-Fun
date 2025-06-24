// nolightnofun/api/simulate.go
package api

import (
	"encoding/binary"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
)

type simReq struct {
	EntityID json.RawMessage `json:"entity_id"`
	R, G, B  byte            `json:"r","g","b"`
	W        byte            `json:"w"`
}

func simulateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req simReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	id, err := rawToUint16(req.EntityID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var pkt [6]byte
	binary.BigEndian.PutUint16(pkt[0:2], id)
	pkt[2], pkt[3], pkt[4], pkt[5] = req.R, req.G, req.B, req.W

	log.Printf("[simulate] id=%d R=%d G=%d B=%d W=%d", id, req.R, req.G, req.B, req.W)
	dispatcher.HandlePacket(pkt[:])
	w.WriteHeader(http.StatusNoContent)
}

func rawToUint16(raw json.RawMessage) (uint16, error) {
	var n uint16
	if err := json.Unmarshal(raw, &n); err == nil && n > 0 {
		return n, nil
	}
	var s string
	if err := json.Unmarshal(raw, &s); err != nil {
		return 0, err
	}
	v, err := strconv.ParseUint(s, 10, 16)
	return uint16(v), err
}
