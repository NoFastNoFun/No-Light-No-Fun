package main

import (
	"context"
	"encoding/binary"
	"sync"
	"time"
)

/* ---------- central engine ---------- */

type eHuBUpdate struct {
	EntityID uint32 `json:"entity"`
	Color    RGB    `json:"rgb"`
}

type router struct {
	mu         sync.RWMutex
	mapping    []MapEntry
	patch      []Patch
	ehubSinks  map[chan eHuBUpdate]struct{}
	dmxSinks   map[chan []byte]struct{}
	rateTicker *time.Ticker
}

func newRouter() *router {
	return &router{
		ehubSinks: make(map[chan eHuBUpdate]struct{}),
		dmxSinks:  make(map[chan []byte]struct{}),
	}
}

/* ---------- public config hooks ---------- */

func (r *router) applyConfig(c Config) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.mapping = c.Mapping // unchanged
	r.patch = c.Patch     // <- use Patch, not PatchMap

	if r.rateTicker != nil {
		r.rateTicker.Stop()
	}
	r.rateTicker = time.NewTicker(
		time.Duration(float64(time.Second) / c.MaxFPS))
}

func (r *router) setPatch(p []Patch) {
	r.mu.Lock()
	r.patch = p
	r.mu.Unlock()
}

/* ---------- sinks (monitors) ---------- */

func (r *router) addEhubSink() chan eHuBUpdate {
	ch := make(chan eHuBUpdate, 128)
	r.mu.Lock()
	r.ehubSinks[ch] = struct{}{}
	r.mu.Unlock()
	return ch
}
func (r *router) removeEhubSink(ch chan eHuBUpdate) {
	r.mu.Lock()
	delete(r.ehubSinks, ch)
	r.mu.Unlock()
	close(ch)
}

func (r *router) addDMXSink() chan []byte {
	ch := make(chan []byte, 64)
	r.mu.Lock()
	r.dmxSinks[ch] = struct{}{}
	r.mu.Unlock()
	return ch
}
func (r *router) removeDMXSink(ch chan []byte) {
	r.mu.Lock()
	delete(r.dmxSinks, ch)
	r.mu.Unlock()
	close(ch)
}

/* ---------- main loop ---------- */

func (r *router) routeLoop(ctx context.Context) {
	buf := make(map[uint32]RGB) // latest colour per entity
	for {
		select {
		case <-ctx.Done():
			return
		case upd := <-ehubChan:
			// broadcast monitor
			cfgMu.RLock()
			mon := cfg.MonitorEhub
			cfgMu.RUnlock()
			if mon {
				r.mu.RLock()
				for s := range r.ehubSinks {
					select {
					case s <- upd:
					default:
					}
				}
				r.mu.RUnlock()
			}
			buf[upd.EntityID] = upd.Color
		case <-r.rateTicker.C:
			r.buildAndSend(buf)
		}
	}
}

func (r *router) buildAndSend(state map[uint32]RGB) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	frames := make(map[string]map[uint16][]byte) // ip -> uni -> DMX[]

	for _, m := range r.mapping {
		if !m.Enable {
			continue
		}
		col, ok := state[m.Entity]
		if !ok {
			continue
		}
		var values []uint8
		switch m.SelectRGBW {
		case "R":
			values = []uint8{col.R}
		case "G":
			values = []uint8{col.G}
		case "B":
			values = []uint8{col.B}
		default:
			values = []uint8{col.R, col.G, col.B}
		}
		if frames[m.Controller] == nil {
			frames[m.Controller] = make(map[uint16][]byte)
		}
		buf := frames[m.Controller][m.Universe]
		if buf == nil {
			buf = make([]byte, dmxSize)
			frames[m.Controller][m.Universe] = buf
		}
		copy(buf[m.Channel-1:], values)
	}

	// apply patch-map
	for _, p := range r.patch {
		for _, u := range frames {
			for _, b := range u {
				if int(p.From) <= len(b) && int(p.To) <= len(b) {
					b[p.To-1] = b[p.From-1]
				}
			}
		}
	}

	// send + DMX monitor
	for ip, uMap := range frames {
		for uni, data := range uMap {
			sendArtNet(ip, uni, data)
			cfgMu.RLock()
			mon := cfg.MonitorDMX
			cfgMu.RUnlock()
			if mon {
				raw := make([]byte, 2+len(data))
				binary.BigEndian.PutUint16(raw, uni)
				copy(raw[2:], data)
				r.mu.RLock()
				for s := range r.dmxSinks {
					select {
					case s <- raw:
					default:
					}
				}
				r.mu.RUnlock()
			}
		}
	}
}

/* ---------- singleton used by other files ---------- */

var updater = newRouter()
