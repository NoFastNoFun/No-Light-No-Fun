package udp

import (
	"log"
	"net"

	"nolightnofun/metrics"
	"nolightnofun/routing"
)

// StartUDPServer feeds incoming eHuB packets into the routing engine.
func StartUDPServer(e *routing.Engine, port int) error {
	addr := net.UDPAddr{IP: net.ParseIP("0.0.0.0"), Port: port}
	conn, err := net.ListenUDP("udp", &addr)
	if err != nil {
		return err
	}
	defer conn.Close()

	buf := make([]byte, 2048)
	for {
		n, _, err := conn.ReadFromUDP(buf)
		if err != nil {
			log.Print(err)
			continue
		}
		metrics.UDPPacketsReceived.Inc()

		b := buf[:n]
		if e.ParseSmallUpdate(b) {
			continue
		}
		if e.ParseConfigPacket(b) {
			continue
		}
	}
}
