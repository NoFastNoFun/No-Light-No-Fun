package udp

import (
	"log"
	"net"
)

// StartUDPServer starts a UDP listener on the configured port
func StartUDPServer() error {
	addr := net.UDPAddr{
		Port: 6454, // default ArtNet or configurable
		IP:   net.ParseIP("0.0.0.0"),
	}

	conn, err := net.ListenUDP("udp", &addr)
	if err != nil {
		return err
	}
	defer conn.Close()

	buf := make([]byte, 1024)
	for {
		n, remoteAddr, err := conn.ReadFromUDP(buf)
		if err != nil {
			log.Printf("UDP read error: %v", err)
			continue
		}

		go handleMessage(buf[:n], remoteAddr)
	}
}

func handleMessage(data []byte, addr *net.UDPAddr) {
	// Placeholder: parse eHuB "update"/"config" format
	log.Printf("Received UDP from %s: % X", addr.String(), data)
	// TODO: Parse and broadcast/update system state
}
