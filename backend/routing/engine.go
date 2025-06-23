package routing

import (
	"encoding/binary"
	"encoding/json"
	"log"
	"strconv"
	"time"

	"nolightnofun/api"
	"nolightnofun/artnet"
	"nolightnofun/metrics"
	"nolightnofun/models"
	"nolightnofun/patchmap"
	"nolightnofun/utils"
)

// ArtNetSummary is streamed to WebSocket clients.
type ArtNetSummary struct {
	IP        string `json:"ip"`
	Universe  int    `json:"universe"`
	Channels  int    `json:"channels"`
	Timestamp int64  `json:"ts"`
}

type Engine struct {
	State     *models.EntityState
	Config    *models.Config
	ThrottleF func()
}

func NewEngine(state *models.EntityState, cfg *models.Config) *Engine {
	return &Engine{
		State:     state,
		Config:    cfg,
		ThrottleF: utils.ThrottleFPS(func() { stateTick(state, cfg) }, cfg.MaxFPS),
	}
}

// NotifyChange schedules a DMX tick respecting FPS throttle.
func (e *Engine) NotifyChange() { e.ThrottleF() }

// ---------------------------------------------------------------------------
// Packet parsing helpers

// ParseSmallUpdate handles 6-byte eHuB update packets.
func (e *Engine) ParseSmallUpdate(buf []byte) bool {
	if len(buf) != 6 {
		return false
	}
	id := int(binary.BigEndian.Uint16(buf[:2]))
	col := models.Color{R: buf[2], G: buf[3], B: buf[4], W: buf[5]}
	e.State.Set(id, col)
	e.NotifyChange()
	return true
}

// ParseConfigPacket placeholder (unchanged)
func (e *Engine) ParseConfigPacket(buf []byte) bool {
	if len(buf) < 1 || buf[0] != 0xC0 {
		return false
	}
	msg := `{"type":"cfg","len":` + strconv.Itoa(len(buf)) + `}`
	api.BroadcastMessage([]byte(msg))
	return true
}

// ---------------------------------------------------------------------------
// DMX tick logic (private)

func stateTick(state *models.EntityState, cfg *models.Config) {
	dmx := make([]byte, 512)
	snap := state.Snapshot()

	for _, m := range cfg.Mappings {
		col, ok := snap[m.EntityID]
		if !ok {
			continue
		}
		base := m.ChannelStart - 1
		if base < 0 || base+3 >= len(dmx) {
			continue
		}
		if m.UseR {
			dmx[base] = col.R
		}
		if m.UseG {
			dmx[base+1] = col.G
		}
		if m.UseB {
			dmx[base+2] = col.B
		}
		if m.UseW && base+3 < len(dmx) {
			dmx[base+3] = col.W
		}
	}

	if len(cfg.Patches) > 0 {
		dmx = patchmap.ApplyPatchMap(dmx, cfg.Patches)
	}

	sent := map[string]bool{}
	for _, m := range cfg.Mappings {
		if sent[m.ControllerIP] {
			continue
		}
		if err := artnet.SendArtNetDMX(m.ControllerIP, m.Universe, dmx); err != nil {
			log.Printf("ArtNet send error: %v", err)
			continue
		}
		metrics.ArtNetPacketsSent.Inc()

		sum, _ := json.Marshal(ArtNetSummary{
			IP:        m.ControllerIP,
			Universe:  m.Universe,
			Channels:  len(dmx),
			Timestamp: time.Now().UnixMilli(),
		})
		api.BroadcastMessage(sum)

		sent[m.ControllerIP] = true
	}
}
