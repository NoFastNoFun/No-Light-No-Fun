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
	e := &Engine{
		State:  state,
		Config: cfg,
	}
	e.ThrottleF = utils.ThrottleFPS(e.tick, cfg.MaxFPS)
	return e
}

func (e *Engine) NotifyChange() { e.ThrottleF() }

// ---------------------------------------------------------------------------
// Packet parsing

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

func (e *Engine) ParseConfigPacket(buf []byte) bool {
	if len(buf) < 1 || buf[0] != 0xC0 {
		return false
	}
	msg := `{"type":"cfg","len":` + strconv.Itoa(len(buf)) + `}`
	api.BroadcastMessage([]byte(msg))
	return true
}

// ---------------------------------------------------------------------------
// Routing tick

func (e *Engine) tick() {
	dmx := make([]byte, 512)
	snap := e.State.Snapshot()

	for _, m := range e.Config.Mappings {
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

	if len(e.Config.Patches) > 0 {
		dmx = patchmap.ApplyPatchMap(dmx, e.Config.Patches)
	}

	sent := map[string]bool{}
	for _, m := range e.Config.Mappings {
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
