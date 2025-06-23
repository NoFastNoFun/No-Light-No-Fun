package api

import (
	"encoding/binary"
	"encoding/json"
	"net"
	"net/http"
	"strconv"
)

// simReq matches the JSON sent by the UI / cURL.
// entity_id may arrive as number (100) or string ("100"),
// so we keep it as raw JSON and interpret it after decoding.
type simReq struct {
	EntityID json.RawMessage `json:"entity_id"`
	R        byte            `json:"r"`
	G        byte            `json:"g"`
	B        byte            `json:"b"`
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

	/* --------------------------------------------------------
	   entity_id → int64, whatever the incoming JSON type was
	-------------------------------------------------------- */
	var id64 int64
	if err := json.Unmarshal(req.EntityID, &id64); err != nil {
		// not a plain number; try quoted string
		var s string
		if err2 := json.Unmarshal(req.EntityID, &s); err2 != nil {
			http.Error(w, "entity_id must be integer or stringified integer", http.StatusBadRequest)
			return
		}
		n, err3 := strconv.ParseInt(s, 10, 64)
		if err3 != nil {
			http.Error(w, "entity_id must be a valid integer", http.StatusBadRequest)
			return
		}
		id64 = n
	}

	if id64 <= 0 || id64 > 65535 {
		http.Error(w, "entity_id must be in 1–65535", http.StatusBadRequest)
		return
	}

	/* --------------------------------------------------------
	   build 6-byte eHuB packet: 2-byte big-endian ID + RGBA
	-------------------------------------------------------- */
	buf := make([]byte, 6)
	binary.BigEndian.PutUint16(buf[0:2], uint16(id64))
	buf[2], buf[3], buf[4], buf[5] = req.R, req.G, req.B, req.W

	conn, err := net.DialUDP("udp", nil, &net.UDPAddr{
		IP:   net.IPv4(127, 0, 0, 1),
		Port: cfg.Port, // UDP listener port from live config
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	_, _ = conn.Write(buf)
	w.WriteHeader(http.StatusNoContent)
}
