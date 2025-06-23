package main

import (
	"log"
	"net/http"
	"os"

	"nolightnofun/api"
	"nolightnofun/config"
	"nolightnofun/models"
	"nolightnofun/routing"
	"nolightnofun/udp"
)

const persistFile = "config.json"

func main() {
	// load existing config if present
	cfg, err := config.LoadConfig(persistFile)
	if err != nil && !os.IsNotExist(err) {
		log.Fatalf("load config: %v", err)
	}
	if cfg.Port == 0 {
		cfg.Port = 6455
	}
	if cfg.MaxFPS == 0 {
		cfg.MaxFPS = 25
	}

	state := models.NewEntityState()
	engine := routing.NewEngine(state, &cfg)

	go func() {
		log.Printf("UDP listener on :%d", cfg.Port)
		if err := udp.StartUDPServer(engine, cfg.Port); err != nil {
			log.Fatalf("UDP: %v", err)
		}
	}()

	log.Println("HTTP server on :8080")
	log.Fatal(http.ListenAndServe(":8080", api.Router(&cfg, persistFile)))
}
