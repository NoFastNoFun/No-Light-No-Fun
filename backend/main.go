package main

import (
	"log"
	"net/http"

	"nolightnofun/api"
	"nolightnofun/udp"
)

func main() {
	// Start HTTP REST + WebSocket API
	go func() {
		log.Println("Starting HTTP server on :8080")
		err := http.ListenAndServe(":8080", api.Router())
		if err != nil {
			log.Fatalf("HTTP server failed: %v", err)
		}
	}()

	// Start UDP listener
	log.Println("Starting UDP listener")
	err := udp.StartUDPServer()
	if err != nil {
		log.Fatalf("UDP server failed: %v", err)
	}
}
