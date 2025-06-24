package main

import (
	"context"
	"encoding/binary"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/gorilla/websocket"
)

/* ------------------------------------------------------------------------- */
/*                                data types                                 */
/* ------------------------------------------------------------------------- */

const (
	dmxSize     = 512
	defaultFPS  = 40
	defaultPort = 6454
)

// RGB holds one eHuB colour (8-bit per channel).
type RGB struct{ R, G, B uint8 }

// eHuBUpdate is pushed by the UDP listener.
type eHuBUpdate struct {
	EntityID uint32
	Color    RGB
}

// Patch maps one DMX channel to another (field hot-fix).
type Patch struct {
	From uint16 `json:"from"`
	To   uint16 `json:"to"`
}

// LED identifies one physical DMX location.
type LED struct {
	IP       string `json:"ip"`
	Universe uint16 `json:"universe"`
	Channel  uint16 `json:"channel"` // 1-based
}

// MapEntry links a named entity-group to a universe-bank.
type MapEntry struct {
	Group   string `json:"group"`
	UniBank string `json:"uniBank"`
	Channel uint16 `json:"channel"`
	Select  string `json:"select"`
	Enable  bool   `json:"enable"`
	Comment string `json:"comment,omitempty"`
}

// Config is persisted and POSTed / PUT via REST.
type Config struct {
	Groups     map[string][]string `json:"groups"`
	Universes  map[string][]LED    `json:"universes"`
	Routes     []MapEntry          `json:"routes"`
	Patch      []Patch             `json:"patch"`
	MaxFPS     float64             `json:"max_fps"`
	EhubPort   int                 `json:"ehub_port"`
	ArtNetPort int                 `json:"artnet_port"`
	MonitorIn  bool                `json:"monitor_ehub"`
	MonitorOut bool                `json:"monitor_dmx"`
	Version    int                 `json:"version"`
}

/* ---------- Art-Net monitor (E9) ---------- */

type artIn struct {
	SourceIP string `json:"ip"`
	Universe uint16 `json:"universe"`
	Data     []byte `json:"data"` // len 512
}

var artInChan = make(chan artIn, 128) // fan-out to WS sinks

/* ------------------------------------------------------------------------- */
/*                          mapper (table driven)                            */
/* ------------------------------------------------------------------------- */

// Target couples one LED location with how to use its channels.
type Target struct {
	LED
	Select string
}

// Mapper performs fast entity → Target look-ups.
type Mapper struct{ tab map[uint32]Target }

func NewMapper(c Config) *Mapper {
	tab := make(map[uint32]Target)
	for _, r := range c.Routes {
		if !r.Enable {
			continue
		}
		g := expandEntities(c.Groups[r.Group])
		u := c.Universes[r.UniBank]
		if len(g) == 0 || len(u) == 0 {
			continue
		}
		i := 0
		for _, eid := range g {
			phys := u[i%len(u)]
			dst := phys
			dst.Channel += r.Channel - 1
			tab[eid] = Target{LED: dst, Select: r.Select}
			i++
		}
	}
	return &Mapper{tab: tab}
}
func (m *Mapper) Lookup(id uint32) (Target, bool) { v, ok := m.tab[id]; return v, ok }

// expand "1-3", "10" → []uint32
func expandEntities(src []string) []uint32 {
	var out []uint32
	for _, s := range src {
		if strings.Contains(s, "-") {
			p := strings.SplitN(s, "-", 2)
			a, _ := strconv.Atoi(p[0])
			b, _ := strconv.Atoi(p[1])
			if a > b {
				a, b = b, a
			}
			for i := a; i <= b; i++ {
				out = append(out, uint32(i))
			}
		} else {
			v, _ := strconv.Atoi(s)
			out = append(out, uint32(v))
		}
	}
	return out
}

/* ------------------------------------------------------------------------- */
/*                             global state                                  */
/* ------------------------------------------------------------------------- */

var (
	cfgMu    sync.RWMutex
	cfg      = defaultConfig()
	mapperMu sync.RWMutex
	mapper   = NewMapper(cfg)

	updater  = newRouter()
	ehubChan = make(chan eHuBUpdate, 1024)
)

// defaults if no file exists
func defaultConfig() Config {
	return Config{
		Groups:     map[string][]string{},
		Universes:  map[string][]LED{},
		MaxFPS:     defaultFPS,
		EhubPort:   7000,
		ArtNetPort: defaultPort,
	}
}

/* ------------------------------------------------------------------------- */
/*                            config file I/O                                */
/* ------------------------------------------------------------------------- */

func loadConfig(path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()
	var c Config
	if err := json.NewDecoder(f).Decode(&c); err != nil {
		return err
	}
	cfgMu.Lock()
	cfg = c
	cfgMu.Unlock()
	rebuildMapper()
	updater.applyConfig(c)
	return nil
}
func rebuildMapper() {
	cfgMu.RLock()
	defer cfgMu.RUnlock()
	mapperMu.Lock()
	mapper = NewMapper(cfg)
	mapperMu.Unlock()
}

/* ------------------------------------------------------------------------- */
/*                           REST / WS handlers                              */
/* ------------------------------------------------------------------------- */

func getConfig(w http.ResponseWriter, _ *http.Request) {
	cfgMu.RLock()
	defer cfgMu.RUnlock()
	_ = json.NewEncoder(w).Encode(cfg)
}
func putConfig(w http.ResponseWriter, r *http.Request) {
	var c Config
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		http.Error(w, err.Error(), 400)
		return
	}
	cfgMu.Lock()
	cfg = c
	cfgMu.Unlock()
	rebuildMapper()
	updater.applyConfig(c)
	w.WriteHeader(http.StatusNoContent)
}
func postPatchCSV(w http.ResponseWriter, r *http.Request) {
	reader := csv.NewReader(r.Body)
	var p []Patch
	for {
		rec, err := reader.Read()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil || len(rec) < 2 {
			http.Error(w, "invalid CSV", 400)
			return
		}
		a, _ := strconv.Atoi(rec[0])
		b, _ := strconv.Atoi(rec[1])
		p = append(p, Patch{uint16(a), uint16(b)})
	}
	cfgMu.Lock()
	cfg.Patch = p
	cfgMu.Unlock()
	updater.setPatch(p)
	w.WriteHeader(http.StatusNoContent)
}

var wsUp = websocket.Upgrader{CheckOrigin: func(*http.Request) bool { return true }}

func wsEhub(w http.ResponseWriter, r *http.Request) {
	c, err := wsUp.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer c.Close()
	s := updater.addEhubSink()
	defer updater.removeEhubSink(s)
	for m := range s {
		_ = c.WriteJSON(m)
	}
}
func wsDMX(w http.ResponseWriter, r *http.Request) {
	c, err := wsUp.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer c.Close()
	s := updater.addDMXSink()
	defer updater.removeDMXSink(s)
	for m := range s {
		_ = c.WriteMessage(websocket.BinaryMessage, m)
	}
}

func fakerState(w http.ResponseWriter, _ *http.Request) {
	fakerStat.RLock()
	defer fakerStat.RUnlock()
	_ = json.NewEncoder(w).Encode(map[string]string{"mode": fakerStat.mode})
}
func fakerStart(w http.ResponseWriter, r *http.Request) {
	var cfg fakerCfg
	if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
		http.Error(w, err.Error(), 400)
		return
	}
	fakerCtrl <- fakerCmd{start: true, cfg: cfg}
	w.WriteHeader(http.StatusNoContent)
}
func fakerStop(w http.ResponseWriter, _ *http.Request) {
	fakerCtrl <- fakerCmd{stop: true}
	w.WriteHeader(http.StatusNoContent)
}

func wsArtNet(w http.ResponseWriter, r *http.Request) {
	c, err := wsUp.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer c.Close()
	sink := make(chan artIn, 64)
	go func() {
		for a := range sink {
			_ = c.WriteJSON(a)
		}
	}()
	for {
		select {
		case msg := <-artInChan:
			sink <- msg
		case <-r.Context().Done():
			close(sink)
			return
		}
	}
}

/* ------------------------------------------------------------------------- */
/*                               router core                                 */
/* ------------------------------------------------------------------------- */

type router struct {
	mu         sync.RWMutex
	patch      []Patch
	rateTicker *time.Ticker
	ehubSinks  map[chan eHuBUpdate]struct{}
	dmxSinks   map[chan []byte]struct{}
}

func newRouter() *router {
	return &router{
		patch:      nil,
		rateTicker: time.NewTicker(time.Second / defaultFPS),
		ehubSinks:  map[chan eHuBUpdate]struct{}{},
		dmxSinks:   map[chan []byte]struct{}{},
	}
}
func (r *router) applyConfig(c Config) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.patch = c.Patch
	if r.rateTicker != nil {
		r.rateTicker.Stop()
	}
	fps := c.MaxFPS
	if fps <= 0 {
		fps = defaultFPS
	}
	r.rateTicker = time.NewTicker(time.Duration(float64(time.Second) / fps))
}
func (r *router) setPatch(p []Patch) {
	r.mu.Lock()
	r.patch = p
	r.mu.Unlock()
}

// sink helpers
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

func (r *router) loop(ctx context.Context) {
	state := make(map[uint32]RGB)
	for {
		select {
		case <-ctx.Done():
			return
		case upd := <-ehubChan:
			cfgMu.RLock()
			if cfg.MonitorIn {
				r.mu.RLock()
				for s := range r.ehubSinks {
					select {
					case s <- upd:
					default:
					}
				}
				r.mu.RUnlock()
			}
			cfgMu.RUnlock()
			state[upd.EntityID] = upd.Color

		case <-r.rateTicker.C:
			r.buildAndSend(state)
		}
	}
}

func (r *router) buildAndSend(state map[uint32]RGB) {
	r.mu.RLock()
	patch := r.patch
	r.mu.RUnlock()

	frames := make(map[string]map[uint16][]byte) // ip → uni → buf

	mapperMu.RLock()
	for eid, col := range state {
		t, ok := mapper.Lookup(eid)
		if !ok {
			continue
		}
		if frames[t.IP] == nil {
			frames[t.IP] = make(map[uint16][]byte)
		}
		buf := frames[t.IP][t.Universe]
		if buf == nil {
			buf = make([]byte, dmxSize)
			frames[t.IP][t.Universe] = buf
		}

		switch t.Select {
		case "R":
			buf[t.Channel-1] = col.R
		case "G":
			buf[t.Channel-1] = col.G
		case "B":
			buf[t.Channel-1] = col.B
		default: // RGB
			copy(buf[t.Channel-1:], []uint8{col.R, col.G, col.B})
		}
	}
	mapperMu.RUnlock()

	for _, p := range patch {
		for _, uni := range frames {
			for _, buf := range uni {
				if int(p.From) <= len(buf) && int(p.To) <= len(buf) {
					buf[p.To-1] = buf[p.From-1]
				}
			}
		}
	}

	for ip, uni := range frames {
		for u, buf := range uni {
			sendArtNet(ip, u, buf)

			cfgMu.RLock()
			if cfg.MonitorOut {
				r.mu.RLock()
				for s := range r.dmxSinks {
					raw := make([]byte, 2+len(buf))
					binary.BigEndian.PutUint16(raw, u)
					copy(raw[2:], buf)
					select {
					case s <- raw:
					default:
					}
				}
				r.mu.RUnlock()
			}
			cfgMu.RUnlock()
		}
	}
}

/* ------------------------------------------------------------------------- */
/*                        Art-Net transmission helpers                       */
/* ------------------------------------------------------------------------- */

func artHeader(u uint16) []byte {
	h := make([]byte, 18)
	copy(h, "Art-Net\x00")
	binary.LittleEndian.PutUint16(h[8:], 0x5000)
	binary.BigEndian.PutUint16(h[10:], 14)
	binary.LittleEndian.PutUint16(h[14:], u)
	binary.BigEndian.PutUint16(h[16:], dmxSize)
	return h
}

var connCache sync.Map // ip → *net.UDPConn

func sendArtNet(ip string, uni uint16, data []byte) {
	val, _ := connCache.LoadOrStore(ip, func() *net.UDPConn {
		c, _ := net.DialUDP("udp", nil, &net.UDPAddr{IP: net.ParseIP(ip), Port: cfg.ArtNetPort})
		return c
	}())
	conn := val.(*net.UDPConn)
	_, _ = conn.Write(append(artHeader(uni), data...))
}

/* ------------------------------------------------------------------------- */
/*                         eHuB UDP minimal listener                         */
/* ------------------------------------------------------------------------- */

func ehubListener(ctx context.Context, port int) {
	pc, err := net.ListenPacket("udp", fmt.Sprintf(":%d", port))
	if err != nil {
		panic(err)
	}
	defer pc.Close()
	buf := make([]byte, 2048)
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}
		n, _, err := pc.ReadFrom(buf)
		if err != nil || n < 7 {
			continue
		}
		eid := binary.BigEndian.Uint32(buf[0:4])
		ehubChan <- eHuBUpdate{EntityID: eid, Color: RGB{buf[4], buf[5], buf[6]}}
	}
}

func artnetListener(ctx context.Context, port int) {
	pc, err := net.ListenPacket("udp", fmt.Sprintf(":%d", port))
	if err != nil {
		fmt.Println("Art-Net listener:", err)
		return
	}
	defer pc.Close()

	buf := make([]byte, 530)
	var addr net.Addr
	var n int
	for {
		select {
		case <-ctx.Done():
			return
		default:
			var err error
			n, addr, err = pc.ReadFrom(buf)
			if err != nil || n < 18 || string(buf[:8]) != "Art-Net\x00" {
				continue
			}
		}
		uni := binary.LittleEndian.Uint16(buf[14:16])
		payload := make([]byte, n-18)
		copy(payload, buf[18:n])
		artInChan <- artIn{SourceIP: addr.String(), Universe: uni, Data: payload}
	}
}

/* ---------- Entity faker (E10) ---------- */

type fakerCmd struct {
	start, stop bool
	cfg         fakerCfg
}
type fakerCfg struct {
	Mode     string   `json:"mode"` // "solid" | "chase"
	RGB      [3]uint8 `json:"rgb,omitempty"`
	SpeedHz  float64  `json:"speed_hz,omitempty"`
	Entities []string `json:"entities"` // ranges
}

var (
	fakerCtrl = make(chan fakerCmd)
	fakerStat = struct {
		sync.RWMutex
		mode string
	}{}
)

func fakerLoop() {
	t := time.NewTicker(time.Second)
	defer t.Stop()
	ents := []uint32{}
	color := RGB{255, 0, 0}
	pos := 0
	for {
		select {
		case cmd := <-fakerCtrl:
			if cmd.stop {
				fakerStat.Lock()
				fakerStat.mode = ""
				fakerStat.Unlock()
				ents = nil
				pos = 0
			}
			if cmd.start {
				ents = expandEntities(cmd.cfg.Entities)
				if len(ents) == 0 {
					ents = []uint32{1}
				}
				if cmd.cfg.Mode == "solid" {
					color = RGB{cmd.cfg.RGB[0], cmd.cfg.RGB[1], cmd.cfg.RGB[2]}
					t.Reset(time.Hour) // no ticking needed
				} else { // chase
					d := time.Duration(float64(time.Second) / cmd.cfg.SpeedHz)
					if d < time.Millisecond*20 {
						d = time.Millisecond * 20
					}
					t.Reset(d)
				}
				fakerStat.Lock()
				fakerStat.mode = cmd.cfg.Mode
				fakerStat.Unlock()
			}

		case <-t.C:
			if fakerStat.mode == "" {
				continue
			}
			if fakerStat.mode == "solid" {
				for _, e := range ents {
					ehubChan <- eHuBUpdate{EntityID: e, Color: color}
				}
			} else { // chase
				for i, e := range ents {
					c := RGB{}
					if i == pos {
						c = RGB{255, 255, 255}
					}
					ehubChan <- eHuBUpdate{EntityID: e, Color: c}
				}
				pos = (pos + 1) % len(ents)
			}
		}
	}
}

/* ------------------------------------------------------------------------- */
/*                                   main                                    */
/* ------------------------------------------------------------------------- */

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func main() {
	addr := getenv("HTTP", ":8080")
	path := getenv("CONFIG", "config.json")

	_ = loadConfig(path)     // ignore absent file
	updater.applyConfig(cfg) // ensure ticker exists

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go ehubListener(ctx, cfg.EhubPort)
	go updater.loop(ctx)

	r := chi.NewRouter()
	r.Use(middleware.Logger, middleware.Recoverer)
	go artnetListener(ctx, cfg.ArtNetPort)
	go fakerLoop()

	// extra routes
	r.Get("/api/faker/state", fakerState)
	r.Post("/api/faker/start", fakerStart)
	r.Post("/api/faker/stop", fakerStop)
	r.Get("/ws/artnet", wsArtNet)
	r.Get("/api/config", getConfig)
	r.Put("/api/config", putConfig)
	r.Post("/api/patch/csv", postPatchCSV)
	r.Get("/ws/ehub", wsEhub)
	r.Get("/ws/dmx", wsDMX)

	srv := &http.Server{Addr: addr, Handler: r}

	go func() {
		ch := make(chan os.Signal, 1)
		signal.Notify(ch, syscall.SIGINT, syscall.SIGTERM)
		<-ch
		_ = srv.Shutdown(context.Background())
		cancel()
	}()

	fmt.Println("listening on", addr)
	if err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
		panic(err)
	}
}
