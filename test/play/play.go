//go:build !opencv
// +build !opencv

// play.go — stream still images or video to the 128×128 wall
//           even universe: 128+36 px, 6-px gap; odd universe: 82 px (last 3 missing)

package main

import (
	"bufio"
	"encoding/binary"
	"flag"
	"fmt"
	"image"
	"image/draw"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"net"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	xdraw "golang.org/x/image/draw"
)

/* ---------- installation constants ---------- */

const (
	dmxSize      = 512
	ledsPerFull  = 170 // even universe
	ledsPerHalf  = 85  // odd universe
	missingOdd   = 0   // last 3 LEDs physically absent
	gapEven      = 0   // 6-pixel gap after even-universe lower strip
	ledsPerPair  = ledsPerFull + ledsPerHalf
	projectorUni = 200
	projectorIP  = "192.168.1.45"

	gridW = 128
	gridH = 128
)

type controller struct {
	ip          string
	first, last uint16
}

var controllers = []controller{
	{"192.168.1.45", 0, 31},
	{"192.168.1.46", 32, 63},
	{"192.168.1.47", 64, 95},
	{"192.168.1.48", 96, 127},
}

/* ---------- Art-Net helpers ---------- */

func artHeader(u uint16) []byte {
	h := make([]byte, 18)
	copy(h, "Art-Net\x00")
	binary.LittleEndian.PutUint16(h[8:], 0x5000)
	binary.BigEndian.PutUint16(h[10:], 14)
	binary.LittleEndian.PutUint16(h[14:], u)
	binary.BigEndian.PutUint16(h[16:], dmxSize)
	return h
}

func uniToIP(u uint16) (string, bool) {
	if u == projectorUni {
		return projectorIP, true
	}
	for _, c := range controllers {
		if u >= c.first && u <= c.last {
			return c.ip, true
		}
	}
	return "", false
}

func send(ip string, uni uint16, data []byte, conns map[string]*net.UDPConn, port int) {
	conn, ok := conns[ip]
	if !ok {
		c, err := net.DialUDP("udp", nil, &net.UDPAddr{IP: net.ParseIP(ip), Port: port})
		if err != nil {
			fmt.Fprintf(os.Stderr, "dial %s: %v\n", ip, err)
			return
		}
		conn = c
		conns[ip] = conn
	}
	_, _ = conn.Write(append(artHeader(uni), data...))
}

/* ---------- mapping helpers ---------- */

// universe/channel for global LED index
func mapLED(idx int) (uint16, int) {
	group := idx / ledsPerPair
	off := idx % ledsPerPair
	evenUni := uint16(group * 2)
	if off < ledsPerFull {
		return evenUni, off * 3
	}
	return evenUni + 1, (off - ledsPerFull) * 3
}

// (row,col,valid) for global LED index
func ledToXY(idx int) (int, int, bool) {
	pair := idx / ledsPerPair
	off := idx % ledsPerPair
	row := pair * 2

	if off < gridW {
		return row, off, true // top row (128 px)
	}
	off -= gridW // 0‥126 in lower half

	if off < ledsPerFull-gridW-gapEven { // 36 px driven by even universe
		return row + 1, off, true
	}
	off -= ledsPerFull - gridW - gapEven // skip 6-px gap

	if off >= ledsPerHalf-missingOdd { // last 3 px of odd universe absent
		return 0, 0, false
	}
	return row + 1, (ledsPerFull - gridW - gapEven) + off, true
}

func rotXY(x, y, deg int) (int, int) {
	switch deg {
	case 90:
		return y, gridW - 1 - x
	case 180:
		return gridW - 1 - x, gridH - 1 - y
	case 270:
		return gridH - 1 - y, x
	default:
		return x, y
	}
}

/* ---------- main ---------- */

func main() {
	file := flag.String("file", "", "image or video file (required)")
	fps := flag.Float64("fps", 30, "frames per second")
	total := flag.Int("leds", 16320, "total LEDs")
	port := flag.Int("port", 6454, "Art-Net UDP port")
	bright := flag.Float64("brightness", 1, "0–1 brightness")
	loop := flag.Bool("loop", true, "loop playback")
	rot := flag.Int("rotate", 90, "rotation 0/90/180/270")
	serp := flag.Bool("serpentine", true, "flip every odd row")
	flag.Parse()

	if *file == "" {
		fmt.Fprintln(os.Stderr, "--file is required")
		os.Exit(1)
	}

	isStill := map[string]bool{
		".png": true, ".jpg": true, ".jpeg": true,
		".bmp": true, ".gif": true, ".tiff": true,
	}[strings.ToLower(filepath.Ext(*file))]

	delay := time.Second / time.Duration(*fps)
	conns := make(map[string]*net.UDPConn)
	defer func() {
		for _, c := range conns {
			_ = c.Close()
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	/* ---------- still images ---------- */

	if isStill {
		f, err := os.Open(*file)
		if err != nil {
			panic(err)
		}
		src, _, err := image.Decode(f)
		f.Close()
		if err != nil {
			panic(err)
		}
		dst := image.NewRGBA(image.Rect(0, 0, gridW, gridH))
		xdraw.ApproxBiLinear.Scale(dst, dst.Bounds(), src, src.Bounds(), draw.Src, nil)

		for {
			select {
			case <-quit:
				return
			default:
			}
			renderImage(dst, *total, *bright, *rot, *serp, port, conns)
			time.Sleep(delay)
		}
	}

	/* ---------- video (ffmpeg) ---------- */

	for {
		cmd := exec.Command("ffmpeg",
			"-loglevel", "quiet", "-i", *file,
			"-vf", fmt.Sprintf("scale=%d:%d,format=rgb24", gridW, gridH),
			"-r", fmt.Sprintf("%.2f", *fps), "-f", "rawvideo", "pipe:1")
		stdout, _ := cmd.StdoutPipe()
		if err := cmd.Start(); err != nil {
			panic(err)
		}

		frame := make([]byte, gridW*gridH*3)
		reader := bufio.NewReader(stdout)

	readLoop:
		for {
			select {
			case <-quit:
				_ = cmd.Process.Kill()
				return
			default:
			}
			if _, err := io.ReadFull(reader, frame); err == io.EOF {
				break readLoop
			} else if err != nil {
				panic(err)
			}
			renderRaw(frame, *total, *bright, *rot, *serp, port, conns)
		}
		_ = cmd.Wait()
		if !*loop {
			return
		}
	}
}

/* ---------- renderers ---------- */

func renderImage(img image.Image, total int, br float64, rot int, serp bool, port *int, conns map[string]*net.UDPConn) {
	frames := map[uint16][]byte{}
	for idx := 0; idx < total; idx++ {
		row, col, ok := ledToXY(idx)
		if !ok {
			continue
		}
		if serp && row%2 == 1 {
			col = gridW - 1 - col
		}
		x, y := rotXY(col, row, rot)

		uni, ch := mapLED(idx)
		if uni == projectorUni {
			continue
		}
		buf := frames[uni]
		if buf == nil {
			buf = make([]byte, dmxSize)
			frames[uni] = buf
		}

		r, g, b, _ := img.At(x, y).RGBA()
		if br < 1 {
			r = uint32(float64(r) * br)
			g = uint32(float64(g) * br)
			b = uint32(float64(b) * br)
		}
		buf[ch], buf[ch+1], buf[ch+2] = uint8(r>>8), uint8(g>>8), uint8(b>>8)
	}
	for uni, data := range frames {
		if ip, ok := uniToIP(uni); ok {
			send(ip, uni, data, conns, *port)
		}
	}
}

func renderRaw(rgb []byte, total int, br float64, rot int, serp bool, port *int, conns map[string]*net.UDPConn) {
	frames := map[uint16][]byte{}
	for idx := 0; idx < total; idx++ {
		row, col, ok := ledToXY(idx)
		if !ok {
			continue
		}
		if serp && row%2 == 1 {
			col = gridW - 1 - col
		}
		x, y := rotXY(col, row, rot)

		uni, ch := mapLED(idx)
		if uni == projectorUni {
			continue
		}
		buf := frames[uni]
		if buf == nil {
			buf = make([]byte, dmxSize)
			frames[uni] = buf
		}

		px := (y*gridW + x) * 3
		r, g, b := rgb[px], rgb[px+1], rgb[px+2]
		if br < 1 {
			r = uint8(float64(r) * br)
			g = uint8(float64(g) * br)
			b = uint8(float64(b) * br)
		}
		buf[ch], buf[ch+1], buf[ch+2] = r, g, b
	}
	for uni, data := range frames {
		if ip, ok := uniToIP(uni); ok {
			send(ip, uni, data, conns, *port)
		}
	}
}
