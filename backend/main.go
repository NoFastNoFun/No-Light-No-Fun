package main

import (
	"log"
	"net/http"

	"nolightnofun/api"
	"nolightnofun/models"
	"nolightnofun/routing"
	"nolightnofun/udp"
)

func main() {
	cfg := models.Config{
		Port:   6455,
		MaxFPS: 25,
	}

	state := models.NewEntityState()
	engine := routing.NewEngine(state, &cfg)

	go func() {
		if err := udp.StartUDPServer(engine, cfg.Port); err != nil {
			log.Fatalf("UDP: %v", err)
		}
	}()

	log.Println("HTTP server on :8080")
	log.Fatal(http.ListenAndServe(":8080", api.Router(&cfg)))
}
