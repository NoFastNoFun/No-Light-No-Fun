package api

import (
	"encoding/binary"
	"log"
	"net"
	"time"

	"nolightnofun/artnet"
	"nolightnofun/models"
)

type Dispatcher struct{ cfg *models.Config }

func NewDispatcher(c *models.Config) *Dispatcher { return &Dispatcher{cfg: c} }

func (d *Dispatcher) Run() {
	addr := net.UDPAddr{IP: net.IPv4zero, Port: d.cfg.Port}
	conn, err := net.ListenUDP("udp", &addr)
	if err != nil {
		log.Printf("[dispatcher] UDP %d busy, listening on random port", d.cfg.Port)
		conn, err = net.ListenUDP("udp", &net.UDPAddr{IP: net.IPv4zero, Port: 0})
		if err != nil {
			log.Fatalf("[dispatcher] FATAL: %v", err)
		}
		d.cfg.Port = conn.LocalAddr().(*net.UDPAddr).Port
	}
	log.Printf("[dispatcher] UDP listener ready on :%d", d.cfg.Port)

	buf := make([]byte, 1024)
	for {
		n, _, _ := conn.ReadFromUDP(buf)
		d.HandlePacket(buf[:n])
	}
}

func (d *Dispatcher) HandlePacket(p []byte) {
	if len(p) != 6 {
		log.Printf("[dispatcher] drop len=%d", len(p))
		return
	}

	id := int(binary.BigEndian.Uint16(p[0:2]))
	r, g, b, w := p[2], p[3], p[4], p[5]
	log.Printf("[dispatcher] frame id=%d R=%d G=%d B=%d W=%d", id, r, g, b, w)

	sent := 0
	for _, m := range d.cfg.Mappings {
		if m.EntityID != id {
			continue
		}

		var dmx [512]byte
		base := m.ChannelStart - 1
		if base < 512 {
			dmx[base] = r
		}
		if base+1 < 512 {
			dmx[base+1] = g
		}
		if base+2 < 512 {
			dmx[base+2] = b
		}
		if m.UseW && base+3 < 512 {
			dmx[base+3] = w
		}

		err := artnet.SendArtNetDMX(m.ControllerIP, m.Universe, dmx[:])
		if err != nil {
			log.Printf("[dispatcher] → %s u=%d ERROR %v", m.ControllerIP, m.Universe, err)
		} else {
			log.Printf("[dispatcher] → %s u=%d OK", m.ControllerIP, m.Universe)
		}
		sent++
	}
	if sent == 0 {
		log.Printf("[dispatcher] WARN: no mapping matches entity %d", id)
	}
}

func init() {
	go func() {
		for range time.Tick(30 * time.Second) {
			log.Print("[dispatcher] alive")
		}
	}()
}
