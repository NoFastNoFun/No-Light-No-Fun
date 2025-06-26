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

/* ------------------------------------------------------------------ */
/*  Wall geometry - identical to play.go                              */
/* ------------------------------------------------------------------ */

const (
	gridW = 128
	gridH = 128

	ledsPerFull = 170 // even universe
	ledsPerHalf = 85  // odd  universe
	gapEven     = 0   // keep =0 because play.go uses 0 (the 6-px void is handled below)
	missingOdd  = 0   // play.go value
	ledsPerPair = ledsPerFull + ledsPerHalf
)

/* ---------- rotation helper (play.go orientation) ---------- */
func rotXY(x, y, deg int) (int, int) {
	switch deg {
	case 90: // counter-clockwise (matches play.go)
		return y, gridW - 1 - x
	case 180:
		return gridW - 1 - x, gridH - 1 - y
	case 270: // clockwise
		return gridH - 1 - y, x
	default:
		return x, y
	}
}

/* ---------- mapping helpers (copied verbatim from play.go) ---------- */

func ledToXY(idx int) (int, int, bool) {
	pair := idx / ledsPerPair
	off := idx % ledsPerPair
	row := pair * 2

	if off < gridW {
		return row, off, true // top row
	}
	off -= gridW // into lower half

	if off < ledsPerFull-gridW-gapEven { // 36 px driven by even universe
		return row + 1, off, true
	}
	off -= ledsPerFull - gridW - gapEven // skip 6-px gap

	if off >= ledsPerHalf-missingOdd { // last 3 LEDs of odd universe absent
		return 0, 0, false
	}
	return row + 1, (ledsPerFull - gridW - gapEven) + off, true
}

/* ------------------------------------------------------------------ */
/*  Streamer                                                          */
/* ------------------------------------------------------------------ */

type streamSpec struct {
	Path       string
	FPS        float64
	Brightness float64
	Rotate     int
	Serp       bool
	Loop       bool
}

const entityOffset = 100 // entity 100 → LED index 0

func startStreamer(ctx context.Context, s streamSpec) error {
	isStill := map[string]bool{
		".png": true, ".jpg": true, ".jpeg": true,
		".bmp": true, ".gif": true, ".tiff": true,
	}[strings.ToLower(filepath.Ext(s.Path))]

	delay := time.Second / time.Duration(s.FPS)
	total := 19858 - entityOffset + 1 // number of entities mapped

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
			ehubChan <- eHuBUpdate{
				EntityID: uint32(idx + entityOffset),
				Color:    RGB{r, g, b},
			}
		}
	}

	/* ---------------- still images ---------------- */

	if isStill {
		f, err := os.Open(s.Path)
		if err != nil {
			return err
		}
		src, _, err := image.Decode(f)
		f.Close()
		if err != nil {
			return err
		}
		dst := image.NewRGBA(image.Rect(0, 0, gridW, gridH))
		xdraw.ApproxBiLinear.Scale(dst, dst.Bounds(), src, src.Bounds(), draw.Src, nil)

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

	/* ---------------- video via FFmpeg ---------------- */

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
