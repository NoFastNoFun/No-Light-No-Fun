package main

import (
	"encoding/csv"
	"encoding/json"
	"errors"
	"io"
	"os"
	"strconv"
	"strings"
	"sync"
)

/* ---------- user-editable schema ---------- */

type RGB struct{ R, G, B uint8 }

/* high-level config blocks (your JSON) */

type GroupConfig map[string][]string // "100-4858", "20000"

type UniDest struct {
	IP       string `json:"ip"`
	Universe uint16 `json:"universe"`
	Channel  uint16 `json:"channel"`
}
type UniBanks map[string][]UniDest

type RouteSpec struct {
	Group   string `json:"group"`
	UniBank string `json:"uniBank"`
	Channel uint16 `json:"channel"`
	Select  string `json:"select"`
	Enable  bool   `json:"enable"`
}

/* router’s internal, flattened mapping */

type MapEntry struct {
	Entity      uint32
	Controller  string
	Universe    uint16
	Channel     uint16
	SelectRGBW  string
	Enable      bool
	Description string
}

/* patch entry */

type Patch struct{ From, To uint16 }

/* full config */

type Config struct {
	/* high-level */
	Groups    GroupConfig `json:"groups"`
	Universes UniBanks    `json:"universes"`
	Routes    []RouteSpec `json:"routes"`

	/* generated for the router */
	Mapping []MapEntry `json:"mapping"`

	/* misc */
	Patch           []Patch `json:"patch"`
	MaxFPS          float64 `json:"max_fps"`
	EhubPort        int     `json:"ehub_port"`
	ArtNetPort      int     `json:"artnet_port"`
	MonitorEhub     bool    `json:"monitor_ehub"`
	MonitorDMX      bool    `json:"monitor_dmx"`
	MonitorArtNetRX bool    `json:"monitor_artnet_rx"`
}

/* ---------- shared state ---------- */

var (
	cfgMu sync.RWMutex
	cfg   = defaultConfig()
)

func defaultConfig() Config {
	return Config{
		MaxFPS:     40,
		EhubPort:   7000,
		ArtNetPort: 6454,
	}
}

/* ---------- load / save ---------- */

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

	expandRoutes(&c) // generates []MapEntry from Groups / Routes

	cfgMu.Lock()
	cfg = c
	cfgMu.Unlock()
	updater.applyConfig(c)
	return nil
}

func saveConfig(path string) error {
	cfgMu.RLock()
	defer cfgMu.RUnlock()
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	enc := json.NewEncoder(f)
	enc.SetIndent("", "  ")
	return enc.Encode(cfg)
}

/* ---------- patch CSV ---------- */

func parsePatchCSV(r io.Reader) ([]Patch, error) {
	reader := csv.NewReader(r)
	var patches []Patch
	for {
		rec, err := reader.Read()
		if errors.Is(err, io.EOF) {
			return patches, nil
		}
		if err != nil || len(rec) < 2 {
			return nil, errors.New("invalid CSV")
		}
		from, _ := strconv.Atoi(rec[0])
		to, _ := strconv.Atoi(rec[1])
		patches = append(patches, Patch{uint16(from), uint16(to)})
	}
}

/* ---------- route expander ---------- */

func expandRoutes(c *Config) {
	var out []MapEntry

	parseRange := func(s string) (uint32, uint32) {
		if strings.Contains(s, "-") {
			parts := strings.SplitN(s, "-", 2)
			a, _ := strconv.ParseUint(parts[0], 10, 32)
			b, _ := strconv.ParseUint(parts[1], 10, 32)
			return uint32(a), uint32(b)
		}
		v, _ := strconv.ParseUint(s, 10, 32)
		return uint32(v), uint32(v)
	}

	for _, rt := range c.Routes {
		ranges := c.Groups[rt.Group]
		destSet := c.Universes[rt.UniBank]
		if len(ranges) == 0 || len(destSet) == 0 {
			continue
		}

		chanPos := int(rt.Channel - 1) // zero-based
		uniIdx := 0

		for _, r := range ranges {
			from, to := parseRange(r)
			for e := from; e <= to; e++ {
				if chanPos+3 > dmxSize {
					uniIdx++
					chanPos = 0
				}
				if uniIdx >= len(destSet) {
					break
				}
				dst := destSet[uniIdx]
				out = append(out, MapEntry{
					Entity:     e,
					Controller: dst.IP,
					Universe:   dst.Universe,
					Channel:    uint16(chanPos + 1),
					SelectRGBW: rt.Select,
					Enable:     rt.Enable,
				})
				chanPos += 3
			}
		}
	}

	c.Mapping = out
}
