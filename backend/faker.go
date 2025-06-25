package main

import (
	"context"
	"errors"
	"sync"
	"time"
)

/* ---------- public API object ---------- */

type faker struct {
	mu     sync.Mutex
	cancel context.CancelFunc
}

var fake = &faker{}

/* start / stop from REST */

type fakerReq struct {
	Mode       string   `json:"mode"` // "solid" | "chase"
	From       uint32   `json:"from"`
	To         uint32   `json:"to"`
	Color      [3]uint8 `json:"color"`                // [R,G,B]
	FPS        float64  `json:"fps,omitempty"`        // only for chase
	Brightness float64  `json:"brightness,omitempty"` // 0..1, default = 1
}

func (f *faker) start(r fakerReq) error {
	f.mu.Lock()
	defer f.mu.Unlock()

	// stop previous if any
	if f.cancel != nil {
		f.cancel()
	}

	ctx, cancel := context.WithCancel(context.Background())
	f.cancel = cancel

	switch r.Mode {
	case "solid":
		go fakerSolid(ctx, r)
	case "chase":
		go fakerChase(ctx, r)
	default:
		cancel()
		return errors.New("unknown mode")
	}
	return nil
}

func (f *faker) stop() {
	f.mu.Lock()
	if f.cancel != nil {
		f.cancel()
		f.cancel = nil
	}
	f.mu.Unlock()
}

/* ---------- pattern impl ---------- */

func fakerSolid(ctx context.Context, req fakerReq) {
	br := req.Brightness
	if br <= 0 || br > 1 {
		br = 1 // default = full
	}
	col := RGB{
		uint8(float64(req.Color[0]) * br),
		uint8(float64(req.Color[1]) * br),
		uint8(float64(req.Color[2]) * br),
	}
	for i := req.From; i <= req.To; i++ {
		ehubChan <- eHuBUpdate{EntityID: i, Color: col}
	}

	tick := time.NewTicker(2 * time.Second) // refresh in case something clears LEDs
	defer tick.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
			for i := req.From; i <= req.To; i++ {
				ehubChan <- eHuBUpdate{EntityID: i, Color: col}
			}
		}
	}
}

func fakerChase(ctx context.Context, req fakerReq) {
	br := req.Brightness
	if br <= 0 || br > 1 {
		br = 1 // default = full
	}
	col := RGB{
		uint8(float64(req.Color[0]) * br),
		uint8(float64(req.Color[1]) * br),
		uint8(float64(req.Color[2]) * br),
	}
	off := RGB{0, 0, 0}
	fps := req.FPS
	if fps <= 0 {
		fps = 20
	}
	d := time.Duration(float64(time.Second) / fps)
	tick := time.NewTicker(d)
	defer tick.Stop()

	cur := req.From
	for {
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
			// turn previous off
			prev := cur - 1
			if prev < req.From {
				prev = req.To
			}
			ehubChan <- eHuBUpdate{EntityID: prev, Color: off}
			ehubChan <- eHuBUpdate{EntityID: cur, Color: col}
			cur++
			if cur > req.To {
				cur = req.From
			}
		}
	}
}
