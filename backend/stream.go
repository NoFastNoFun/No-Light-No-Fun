package main

import (
	"bufio"
	"context"
	"fmt"
	"image"
	"image/draw"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	xdraw "golang.org/x/image/draw"
)

const (
	gridW = 128
	gridH = 128
)

// stream.go   (same change applies if you copied rotXY elsewhere)
func rotXY(x, y, deg int) (int, int) {
	switch deg {
	case 90: // now clockwise
		return gridH - 1 - y, x
	case 180: // unchanged
		return gridW - 1 - x, gridH - 1 - y
	case 270: // now counter-clockwise
		return y, gridW - 1 - x
	default:
		return x, y // 0°
	}
}

/* entity id 100 ⟶ LED index 0 (adjust if your first entity differs) */
const entityOffset = 100

func ledToXY(idx int) (int, int, bool) {
	pair := idx / 255 // 170+85 LEDs per 2 universes
	off := idx % 255
	row := pair * 2

	if off < gridW {
		return row, off, true
	}
	off -= gridW
	if off < 36 { // even-universe bottom segment
		return row + 1, off, true
	}
	off -= 36 // skip the 6-px physical gap
	if off >= 82 {
		return 0, 0, false // last 3 LEDs in odd universe are absent
	}
	return row + 1, 36 + off, true
}

/* ---------- streamer goroutine ---------- */

type streamSpec struct {
	Path       string
	FPS        float64
	Brightness float64
	Rotate     int
	Serp       bool
	Loop       bool
}

func startStreamer(ctx context.Context, s streamSpec) error {
	isStill := map[string]bool{
		".png": true, ".jpg": true, ".jpeg": true,
		".bmp": true, ".gif": true, ".tiff": true,
	}[strings.ToLower(filepath.Ext(s.Path))]

	delay := time.Second / time.Duration(s.FPS)
	total := 19858 - entityOffset + 1 // entities you mapped
	br := s.Brightness
	if br <= 0 || br > 1 {
		br = 1
	}

	push := func(rgb []byte) {
		for idx := 0; idx < total; idx++ {
			row, col, ok := ledToXY(idx)
			if !ok {
				continue
			}
			if s.Serp && row%2 == 1 {
				col = gridW - 1 - col
			}
			x, y := rotXY(col, row, s.Rotate)

			/* NEW guard: stay inside 128 × 128 frame */
			if x < 0 || x >= gridW || y < 0 || y >= gridH {
				continue
			}
			px := (y*gridW + x) * 3
			r, g, b := rgb[px], rgb[px+1], rgb[px+2]
			if br < 1 {
				r = uint8(float64(r) * br)
				g = uint8(float64(g) * br)
				b = uint8(float64(b) * br)
			}
			eid := uint32(idx + entityOffset)
			ehubChan <- eHuBUpdate{EntityID: eid, Color: RGB{r, g, b}}
		}
	}

	if isStill {
		file, err := os.Open(s.Path)
		if err != nil {
			return err
		}
		src, _, err := image.Decode(file)
		file.Close()
		if err != nil {
			return err
		}
		dst := image.NewRGBA(image.Rect(0, 0, gridW, gridH))
		xdraw.ApproxBiLinear.Scale(dst, dst.Bounds(), src, src.Bounds(), draw.Src, nil)

		// freeze-frame loop
		go func() {
			for {
				select {
				case <-ctx.Done():
					return
				default:
				}
				push(dst.Pix)
				time.Sleep(delay)
				if !s.Loop {
					return
				}
			}
		}()
		return nil
	}

	// ---------- video (ffmpeg) ----------
	go func() {
		for {
			cmd := exec.CommandContext(ctx, "ffmpeg",
				"-loglevel", "quiet", "-i", s.Path,
				"-vf", "scale=128:128,format=rgb24",
				"-r", fmt.Sprintf("%.2f", s.FPS),
				"-f", "rawvideo", "pipe:1")
			stdout, _ := cmd.StdoutPipe()
			if err := cmd.Start(); err != nil {
				return
			}
			reader := bufio.NewReader(stdout)
			frame := make([]byte, gridW*gridH*3)

		frameLoop:
			for {
				select {
				case <-ctx.Done():
					_ = cmd.Process.Kill()
					return
				default:
				}
				if _, err := io.ReadFull(reader, frame); err == io.EOF {
					break frameLoop
				} else if err != nil {
					break frameLoop
				}
				push(frame)
			}
			_ = cmd.Wait()
			if !s.Loop {
				return
			}
		}
	}()
	return nil
}
