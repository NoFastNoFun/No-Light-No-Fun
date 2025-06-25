package main

import (
	"context"
	"encoding/binary"
	"fmt"
	"net"
)

var ehubChan = make(chan eHuBUpdate, 1024)

func ehubReceiver(ctx context.Context, port int) {
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
		upd := eHuBUpdate{EntityID: eid, Color: RGB{buf[4], buf[5], buf[6]}}
		ehubChan <- upd
	}
}
