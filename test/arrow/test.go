package main

import (
	"encoding/binary"
	"flag"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/signal"
	"sync/atomic"
	"syscall"
	"time"
)

const (
	dmxSize      = 512
	ledsPerHalf  = 85
	ledsPerFull  = 170
	ledsPerPair  = 255
	projectorUni = 200
	projectorIP  = "192.168.1.45"
)

// ---------- controller mapping ----------

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

// ---------- Art-Net helpers ----------

func artHeader(u uint16) []byte {
	h := make([]byte, 18)
	copy(h, "Art-Net\x00")
	binary.LittleEndian.PutUint16(h[8:], 0x5000)
	binary.BigEndian.PutUint16(h[10:], 14)
	binary.LittleEndian.PutUint16(h[14:], u)
	binary.BigEndian.PutUint16(h[16:], dmxSize)
	return h
}

func send(u uint16, d []byte, conns map[string]*net.UDPConn, port int) {
	ip, ok := universeToIP(u)
	if !ok || ip == "" {
		return
	}
	c, ok := conns[ip]
	if !ok {
		var err error
		c, err = net.DialUDP("udp", nil, &net.UDPAddr{IP: net.ParseIP(ip), Port: port})
		if err != nil {
			fmt.Fprintln(os.Stderr, "udp:", err)
			return
		}
		conns[ip] = c
	}
	c.Write(append(artHeader(u), d...))
}

// ---------- LED index mapping ----------

func mapLED(n int) (uint16, int) {
	group := n / ledsPerPair
	offset := n % ledsPerPair
	even := uint16(group * 2)
	if offset < ledsPerFull {
		return even, offset * 3
	}
	return even + 1, (offset - ledsPerFull) * 3
}

// ---------- main ----------

func main() {
	fps := flag.Float64("fps", 40, "frames per second")
	cols := flag.Int("cols", 255, "LEDs per row (up/down step)")
	leds := flag.Int("leds", 16320, "total LEDs")
	start := flag.Int("start", 0, "initial LED index (0-based)")
	port := flag.Int("port", 6454, "Art-Net UDP port")
	httpA := flag.String("http", ":8090", "HTTP listen addr ('' disables)")
	r := flag.Uint("r", 255, "red 0-255")
	g := flag.Uint("g", 255, "green 0-255")
	b := flag.Uint("b", 255, "blue 0-255")
	flag.Parse()

	if *fps <= 0 || *cols <= 0 || *start < 0 || *start >= *leds {
		fmt.Fprintln(os.Stderr, "bad parameters")
		os.Exit(1)
	}

	/* --- shared state --- */
	var px int64 = int64(*start)
	prev := *start
	delay := time.Second / time.Duration(*fps)
	conns := make(map[string]*net.UDPConn)

	/* --- HTTP UI --- */
	if *httpA != "" {
		go func() {
			http.HandleFunc("/", page)
			http.HandleFunc("/move", func(w http.ResponseWriter, r *http.Request) {
				switch r.URL.Query().Get("dir") {
				case "left":
					atomic.AddInt64(&px, -1)
				case "right":
					atomic.AddInt64(&px, 1)
				case "up":
					atomic.AddInt64(&px, int64(-*cols))
				case "down":
					atomic.AddInt64(&px, int64(*cols))
				}
			})
			http.ListenAndServe(*httpA, nil)
		}()
	}

	/* --- terminal keys --- */
	go arrows(&px, *cols)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	tick := time.NewTicker(delay)
	defer tick.Stop()

	for {
		select {
		case <-quit:
			return
		case <-tick.C:
			cur := int(atomic.LoadInt64(&px))
			for cur < 0 {
				cur += *leds
			}
			for cur >= *leds {
				cur -= *leds
			}
			atomic.StoreInt64(&px, int64(cur))

			frames := make(map[uint16][]byte)

			/* clear prev */
			if prev != cur {
				u, ch := mapLED(prev)
				if u != projectorUni {
					buf := make([]byte, dmxSize)
					frames[u] = buf
					if ch+2 < dmxSize {
						buf[ch], buf[ch+1], buf[ch+2] = 0, 0, 0
					}
				}
				prev = cur
			}

			/* draw cur */
			u, ch := mapLED(cur)
			if u != projectorUni {
				buf := make([]byte, dmxSize)
				if ch+2 < dmxSize {
					buf[ch] = uint8(*r)
					buf[ch+1] = uint8(*g)
					buf[ch+2] = uint8(*b)
				}
				frames[u] = buf
			}

			for uni, data := range frames {
				send(uni, data, conns, *port)
			}
		}
	}
}

/* --- helpers --- */

func page(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(`<!doctype html><html><body>
<h2>Move pixel</h2>
<button onclick="mv('up')">&#x2191;</button><br>
<button onclick="mv('left')">&#x2190;</button>
<button onclick="mv('down')">&#x2193;</button>
<button onclick="mv('right')">&#x2192;</button>
<script>
function mv(d){fetch('/move?dir='+d,{method:'POST'});}
document.addEventListener('keydown',e=>{
  if(e.key==='ArrowLeft')mv('left');
  if(e.key==='ArrowRight')mv('right');
  if(e.key==='ArrowUp')mv('up');
  if(e.key==='ArrowDown')mv('down');
});
</script></body></html>`))
}

func arrows(px *int64, cols int) {
	buf := make([]byte, 3)
	for {
		n, _ := os.Stdin.Read(buf)
		if n == 0 {
			continue
		}
		switch {
		case n == 3 && buf[0] == 0x1b && buf[1] == '[':
			switch buf[2] {
			case 'D':
				atomic.AddInt64(px, -1)
			case 'C':
				atomic.AddInt64(px, 1)
			case 'A':
				atomic.AddInt64(px, int64(-cols))
			case 'B':
				atomic.AddInt64(px, int64(cols))
			}
		case n == 2 && (buf[0] == 0 || buf[0] == 0xe0):
			switch buf[1] {
			case 0x4b:
				atomic.AddInt64(px, -1) // left
			case 0x4d:
				atomic.AddInt64(px, 1) // right
			case 0x48:
				atomic.AddInt64(px, int64(-cols)) // up
			case 0x50:
				atomic.AddInt64(px, int64(cols)) // down
			}
		}
	}
}
