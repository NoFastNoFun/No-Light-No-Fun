package api

import (
	"encoding/binary"
	"log"
	"net"
	"strings"
	"time"

	"nolightnofun/artnet"
	"nolightnofun/models"
)

type Dispatcher struct{ cfg *models.Config }

func NewDispatcher(c *models.Config) *Dispatcher { return &Dispatcher{cfg: c} }

func (d *Dispatcher) Run() {
	addr := net.UDPAddr{IP: net.IPv4zero, Port: d.cfg.Port}
	conn, err := net.ListenUDP("udp", &addr)

	/* -----------------------------------------------
	   Port busy → just skip the listener, but DO NOT
	   crash.  Simulation and outbound Art-Net still
	   function via HandlePacket().
	------------------------------------------------*/
	if err != nil {
		if strings.Contains(err.Error(), "address") || strings.Contains(err.Error(), "in use") {
			log.Printf("[dispatcher] UDP %d already in use; disabling eHuB listener (simulation still works)", d.cfg.Port)
			return
		}
		log.Printf("[dispatcher] UDP bind failed: %v", err)
		return
	}
	defer conn.Close()
	log.Printf("[dispatcher] UDP listener ready on :%d", d.cfg.Port)

	buf := make([]byte, 1024)
	for {
		n, _, _ := conn.ReadFromUDP(buf)
		d.HandlePacket(buf[:n])
	}
}

func (d *Dispatcher) HandlePacket(p []byte) {
	if len(p) != 6 {
		return
	}

	id := int(binary.BigEndian.Uint16(p[0:2]))
	r, g, b, w := p[2], p[3], p[4], p[5]

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

		_ = artnet.SendArtNetDMX(m.ControllerIP, m.Universe, dmx[:])
	}
}

func init() {
	go func() {
		for range time.Tick(30 * time.Second) {
			log.Print("[dispatcher] alive")
		}
	}()
}
