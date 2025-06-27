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
	Mode       string   `json:"mode"` // "solid" | "chase" | "fill" | "gradient"
	From       uint32   `json:"from"`
	To         uint32   `json:"to"`
	Color      [3]uint8 `json:"color"`                // base colour (unused by gradient)
	FPS        float64  `json:"fps,omitempty"`        // frame-rate for animated modes
	Brightness float64  `json:"brightness,omitempty"` // 0 ≤ x ≤ 1 : global dimmer
}

func scale(col [3]uint8, br float64) RGB {
	if br <= 0 || br > 1 {
		br = 1
	}
	return RGB{
		uint8(float64(col[0])*br + 0.5),
		uint8(float64(col[1])*br + 0.5),
		uint8(float64(col[2])*br + 0.5),
	}
}

func (f *faker) start(r fakerReq) error {
	f.mu.Lock()
	defer f.mu.Unlock()

	/* stop previous pattern (if any) */
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
	case "fill":
		go fakerFill(ctx, r)
	case "gradient":
		go fakerGradient(ctx, r)
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
		br = 1
	}
	col := scale(req.Color, br)
	for i := req.From; i <= req.To; i++ {
		ehubChan <- eHuBUpdate{EntityID: i, Color: col}
	}

	tick := time.NewTicker(2 * time.Second) // refresh
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
		br = 1
	}
	col := scale(req.Color, br)

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

func fakerFill(ctx context.Context, req fakerReq) {
	col := scale(req.Color, req.Brightness)
	fps := req.FPS
	if fps <= 0 {
		fps = 20
	}
	tick := time.NewTicker(time.Duration(float64(time.Second) / fps))
	defer tick.Stop()

	current := req.From
	for {
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
			ehubChan <- eHuBUpdate{EntityID: current, Color: col}
			if current >= req.To {
				return
			}
			current++
		}
	}
}
