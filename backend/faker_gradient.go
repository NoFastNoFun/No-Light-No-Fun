package main

import (
	"context"
	"math"
	"time"
)

/* fakerGradient streams a moving HSV rainbow across the entity range. */
func fakerGradient(ctx context.Context, req fakerReq) {
	/* -------- parameters -------- */
	fps := req.FPS
	if fps <= 0 {
		fps = 40
	}
	const speed = 0.07          // hue cycles per second
	const sat = 1.0             // full saturation
	val := 0.8 * req.Brightness // base 0.8 scaled by brightness
	if val <= 0 || val > 1 {
		val = 0.8
	}

	delay := time.Duration(float64(time.Second) / fps)
	tick := time.NewTicker(delay)
	defer tick.Stop()

	start := time.Now()
	total := int(req.To - req.From + 1)
	if total <= 0 {
		return
	}

	for {
		select {
		case <-ctx.Done():
			return
		case t := <-tick.C:
			phase := speed * t.Sub(start).Seconds()
			for i := 0; i < total; i++ {
				h := math.Mod(float64(i)/float64(total)+phase, 1)
				r, g, b := hsvToRGB(h, sat, val)
				ehubChan <- eHuBUpdate{
					EntityID: req.From + uint32(i),
					Color:    RGB{r, g, b},
				}
			}
		}
	}
}

/* hsvToRGB converts HSV ∈ [0,1]³ to 0-255 RGB. */
func hsvToRGB(h, s, v float64) (uint8, uint8, uint8) {
	if s == 0 {
		val := uint8(v * 255)
		return val, val, val
	}
	h = math.Mod(h, 1) * 6
	i := int(h)
	f := h - float64(i)
	p, q, t := v*(1-s), v*(1-s*f), v*(1-s*(1-f))

	var r, g, b float64
	switch i {
	case 0:
		r, g, b = v, t, p
	case 1:
		r, g, b = q, v, p
	case 2:
		r, g, b = p, v, t
	case 3:
		r, g, b = p, q, v
	case 4:
		r, g, b = t, p, v
	default:
		r, g, b = v, p, q
	}
	return uint8(r * 255), uint8(g * 255), uint8(b * 255)
}
