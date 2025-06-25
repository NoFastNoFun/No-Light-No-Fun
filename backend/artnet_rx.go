package main

import (
	"context"
	"encoding/binary"
	"net"
	"strconv"
	"sync"
)

/* ---------- frame & sink management ---------- */

type artFrame struct {
	Universe uint16
	Data     []byte // always 512 bytes
}

var (
	artSinkMu sync.RWMutex
	artSinks  = make(map[chan []byte]struct{}) // binary frame: 2 B uni + 512 B DMX
)

/* add / remove sinks (ws handlers) */
func addArtSink() chan []byte {
	ch := make(chan []byte, 64)
	artSinkMu.Lock()
	artSinks[ch] = struct{}{}
	artSinkMu.Unlock()
	return ch
}
func removeArtSink(ch chan []byte) {
	artSinkMu.Lock()
	delete(artSinks, ch)
	artSinkMu.Unlock()
	close(ch)
}

/* ---------- UDP listener ---------- */

func artnetReceiver(ctx context.Context, port int) {
	pc, err := net.ListenPacket("udp", net.JoinHostPort("", strconv.Itoa(port)))
	if err != nil {
		panic(err)
	}
	defer pc.Close()

	buf := make([]byte, 1536) // enough for ArtDMX
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}
		n, _, err := pc.ReadFrom(buf)
		if err != nil || n < 18 {
			continue
		}
		if string(buf[:7]) != "Art-Net" {
			continue
		}
		op := binary.LittleEndian.Uint16(buf[8:])
		if op != 0x5000 { // only ArtDMX
			continue
		}
		uni := binary.LittleEndian.Uint16(buf[14:])
		dlen := int(binary.BigEndian.Uint16(buf[16:]))
		if dlen > dmxSize || 18+dlen > n {
			continue
		}
		frame := make([]byte, 2+dmxSize)
		binary.BigEndian.PutUint16(frame, uni)
		copy(frame[2:], buf[18:18+dlen])

		// broadcast if monitor enabled
		cfgMu.RLock()
		mon := cfg.MonitorArtNetRX
		cfgMu.RUnlock()
		if !mon {
			continue
		}
		artSinkMu.RLock()
		for s := range artSinks {
			select {
			case s <- frame:
			default:
			}
		}
		artSinkMu.RUnlock()
	}
}
