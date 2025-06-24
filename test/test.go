package main

import (
	"encoding/binary"
	"flag"
	"fmt"
	"net"
	"os"
	"time"
)

// buildArtDMXHeader constructs an Art-Net ArtDMX (OpCode 0x5000) packet header.
// The header layout is fixed-length (18 bytes) and follows the Art-Net 4 specification.
func buildArtDMXHeader(universe uint16) []byte {
	header := make([]byte, 18)

	// ID "Art-Net" plus null terminator
	copy(header[0:], []byte("Art-Net\x00"))

	// OpCode (little-endian) 0x5000 → 00 50
	binary.LittleEndian.PutUint16(header[8:], 0x5000)

	// Protocol version (big-endian) 14 → 00 0E
	binary.BigEndian.PutUint16(header[10:], 14)

	// Sequence (0) and Physical (0)
	header[12] = 0
	header[13] = 0

	// Universe (little-endian)
	binary.LittleEndian.PutUint16(header[14:], universe)

	// Length (big-endian) fixed at 512
	binary.BigEndian.PutUint16(header[16:], 512)

	return header
}

// sendArtNetDMX builds and transmits a single Art-Net DMX packet to ip:port.
func sendArtNetDMX(ip string, universe uint16, data []byte, port int) error {
	addr := &net.UDPAddr{IP: net.ParseIP(ip), Port: port}
	conn, err := net.DialUDP("udp", nil, addr)
	if err != nil {
		return err
	}
	defer conn.Close()

	packet := append(buildArtDMXHeader(universe), data...)
	_, err = conn.Write(packet)
	return err
}

func main() {
	var (
		ip       = flag.String("ip", "", "BC216 IP address (required)")
		universe = flag.Uint("universe", 0, "Art-Net universe number (required)")
		r        = flag.Uint("r", 255, "Red   (0–255)")
		g        = flag.Uint("g", 0, "Green (0–255)")
		b        = flag.Uint("b", 0, "Blue  (0–255)")
		delay    = flag.Float64("delay", 0.1, "Seconds between each LED")
		port     = flag.Int("port", 6454, "Art-Net port (default 6454)")
	)
	flag.Parse()

	if *ip == "" || *universe == 0 {
		fmt.Fprintln(os.Stderr, "Error: --ip and --universe are required")
		flag.Usage()
		os.Exit(1)
	}

	const maxLEDs = 170
	for i := 1; i <= maxLEDs; i++ {
		buf := make([]byte, 512)
		base := 3 * (i - 1)
		if base+2 < len(buf) {
			buf[base] = byte(*r)
			buf[base+1] = byte(*g)
			buf[base+2] = byte(*b)
		}

		if err := sendArtNetDMX(*ip, uint16(*universe), buf, *port); err != nil {
			fmt.Fprintf(os.Stderr, "send error: %v\n", err)
			os.Exit(1)
		}

		fmt.Printf("Lit LED %d in universe %d\n", i, *universe)
		time.Sleep(time.Duration(*delay * float64(time.Second)))
	}
}

// Usage: go run test/test.go --ip <BC216_IP> --universe <UNIVERSE> --r <RED> --g <GREEN> --b <BLUE> [--delay <DELAY>] [--port <PORT>]
