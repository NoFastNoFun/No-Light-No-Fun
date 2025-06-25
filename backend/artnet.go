package main

import (
	"encoding/binary"
	"net"
	"sync"
)

const dmxSize = 512

func artHeader(u uint16) []byte {
	h := make([]byte, 18)
	copy(h, "Art-Net\x00")
	binary.LittleEndian.PutUint16(h[8:], 0x5000)
	binary.BigEndian.PutUint16(h[10:], 14)
	binary.LittleEndian.PutUint16(h[14:], u)
	binary.BigEndian.PutUint16(h[16:], dmxSize)
	return h
}

var connCache sync.Map // ip -> *net.UDPConn

func sendArtNet(ip string, uni uint16, data []byte) {
	val, _ := connCache.LoadOrStore(ip, func() *net.UDPConn {
		c, _ := net.DialUDP("udp", nil, &net.UDPAddr{IP: net.ParseIP(ip), Port: cfg.ArtNetPort})
		return c
	}())
	conn := val.(*net.UDPConn)
	_, _ = conn.Write(append(artHeader(uni), data...))
}
