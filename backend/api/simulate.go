package api

import (
	"encoding/binary"
	"encoding/json"
	"net"
	"net/http"
)

type simReq struct {
	ID int  `json:"id"`
	R  byte `json:"r"`
	G  byte `json:"g"`
	B  byte `json:"b"`
	W  byte `json:"w"`
}

// simulateHandler accepts JSON and sends a 6-byte update via UDP loopback.
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

	buf := make([]byte, 6)
	binary.BigEndian.PutUint16(buf, uint16(req.ID))
	buf[2], buf[3], buf[4], buf[5] = req.R, req.G, req.B, req.W

	conn, err := net.DialUDP("udp", nil, &net.UDPAddr{
		IP: net.IPv4(127, 0, 0, 1), Port: cfg.Port,
	})
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer conn.Close()
	_, _ = conn.Write(buf)
	w.WriteHeader(204)
}
