package main

import (
	"encoding/binary"
	"flag"
	"fmt"
	"math"
	"net"
	"os"
	"os/signal"
	"syscall"
	"time"
)

// buildArtDMXHeader constructs an Art-Net ArtDMX packet header.
// Deprecated: kept for tooling compatibility; use sendFrame instead.
func buildArtDMXHeader(universe uint16) []byte {
	h := make([]byte, 18)
	copy(h, []byte("Art-Net\x00"))
	binary.LittleEndian.PutUint16(h[8:], 0x5000) // OpCode ArtDMX
	binary.BigEndian.PutUint16(h[10:], 14)       // ProtVer
	binary.LittleEndian.PutUint16(h[14:], universe)
	binary.BigEndian.PutUint16(h[16:], 512)
	return h
}

// sendArtNetDMX writes a single DMX frame. Deprecated.
func sendArtNetDMX(ip string, universe uint16, data []byte, port int) error { // Deprecated
	conn, err := net.DialUDP("udp", nil, &net.UDPAddr{IP: net.ParseIP(ip), Port: port})
	if err != nil {
		return err
	}
	defer conn.Close()
	_, err = conn.Write(append(buildArtDMXHeader(universe), data...))
	return err
}

// hsvToRGB converts HSV ∈[0,1]³ to 0-255 RGB.
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

const (
	dmxSize      = 512 // bytes per DMX universe
	ledsPerHalf  = 85  // 255 channels
	ledsPerFull  = 170 // even-universe capacity
	ledsPerPair  = 255 // half+full = two universes
	projectorUni = 200 // excluded from animation
	projectorIP  = "192.168.1.45"
)

type controller struct {
	ip    string
	first uint16
	last  uint16
}

var controllers = []controller{
	{"192.168.1.45", 0, 31},
	{"192.168.1.46", 32, 63},
	{"192.168.1.47", 64, 95},
	{"192.168.1.48", 96, 127},
}

func universeToIP(u uint16) (string, bool) {
	for _, c := range controllers {
		if u >= c.first && u <= c.last {
			return c.ip, true
		}
	}
	if u == projectorUni {
		return projectorIP, true
	}
	return "", false
}

// sendFrame re-uses UDP sockets per IP for efficiency.
func sendFrame(ip string, universe uint16, data []byte, conns map[string]*net.UDPConn, port int) error {
	if len(data) != dmxSize {
		return fmt.Errorf("frame must be %d bytes", dmxSize)
	}
	conn, ok := conns[ip]
	if !ok {
		var err error
		conn, err = net.DialUDP("udp", nil, &net.UDPAddr{IP: net.ParseIP(ip), Port: port})
		if err != nil {
			return err
		}
		conns[ip] = conn
	}
	_, err := conn.Write(append(buildArtDMXHeader(universe), data...))
	return err
}

// mapLED returns (universe, channel) for global LED index n.
func mapLED(n int) (uint16, int) {
	group := n / ledsPerPair     // even+odd pair
	offset := n % ledsPerPair    // 0–254
	evenUni := uint16(group * 2) // base universe
	if offset < ledsPerFull {    // in even universe (full band + half)
		return evenUni, offset * 3
	}
	// remaining half in the odd universe
	return evenUni + 1, (offset - ledsPerFull) * 3
}

func main() {
	fps := flag.Float64("fps", 40, "frames per second")
	speed := flag.Float64("speed", 0.07, "hue cycles per second")
	sat := flag.Float64("sat", 1, "HSV saturation 0–1")
	val := flag.Float64("val", 0.8, "HSV value 0–1")
	totalLEDs := flag.Int("leds", 16320, "total LEDs in installation")
	port := flag.Int("port", 6454, "Art-Net port")
	flag.Parse()

	if *fps <= 0 {
		fmt.Fprintln(os.Stderr, "fps must be > 0")
		os.Exit(1)
	}
	delay := time.Second / time.Duration(*fps)
	start := time.Now()
	conns := make(map[string]*net.UDPConn)
	defer func() {
		for _, c := range conns {
			c.Close()
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	tick := time.NewTicker(delay)
	defer tick.Stop()

	for {
		select {
		case <-quit:
			return
		case t := <-tick.C:
			elapsed := t.Sub(start).Seconds()
			hueShift := *speed * elapsed
			frames := make(map[uint16][]byte)

			for i := 0; i < *totalLEDs; i++ {
				h := math.Mod(float64(i)/float64(*totalLEDs)+hueShift, 1)
				r, g, b := hsvToRGB(h, *sat, *val)
				u, ch := mapLED(i)
				if u == projectorUni { // skip the projector
					continue
				}
				buf, ok := frames[u]
				if !ok {
					buf = make([]byte, dmxSize)
					frames[u] = buf
				}
				if ch+2 < dmxSize {
					buf[ch], buf[ch+1], buf[ch+2] = r, g, b
				}
			}

			for u, data := range frames {
				ip, ok := universeToIP(u)
				if !ok {
					continue
				}
				if err := sendFrame(ip, u, data, conns, *port); err != nil {
					fmt.Fprintf(os.Stderr, "send error: universe %d: %v\n", u, err)
				}
			}
		}
	}
}

// to run: go run main.go -fps 30 -speed 0.1 -sat 1 -val 0.8 -leds 16320 -port 6454
