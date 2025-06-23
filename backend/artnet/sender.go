package artnet

import (
	"net"
)

// SendArtNetDMX sends a DMX packet to a controller via ArtNet
func SendArtNetDMX(ip string, universe int, dmxData []byte) error {
	conn, err := net.DialUDP("udp", nil, &net.UDPAddr{
		IP:   net.ParseIP(ip),
		Port: 6454,
	})
	if err != nil {
		return err
	}
	defer conn.Close()

	packet := buildArtNetPacket(universe, dmxData)
	_, err = conn.Write(packet)
	return err
}

// buildArtNetPacket constructs a valid ArtNet DMX packet
func buildArtNetPacket(universe int, dmx []byte) []byte {
	length := len(dmx)
	if length > 512 {
		length = 512
	}

	packet := make([]byte, 18+length)
	copy(packet[0:], []byte("Art-Net\x00"))
	packet[8] = 0x00 // OpCode low byte (OpOutput)
	packet[9] = 0x50 // OpCode high byte
	packet[10] = 0x00
	packet[11] = 0x0e // protocol version
	packet[12] = 0x00 // sequence
	packet[13] = 0x00 // physical
	packet[14] = byte(universe & 0xFF)
	packet[15] = byte((universe >> 8) & 0xFF)
	packet[16] = byte((length >> 8) & 0xFF)
	packet[17] = byte(length & 0xFF)
	copy(packet[18:], dmx[:length])
	return packet
}
