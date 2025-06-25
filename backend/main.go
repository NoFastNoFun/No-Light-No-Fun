package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
)

func main() {
	const cfgPath = "config.json"
	_ = loadConfig(cfgPath) // ignore if file doesn't exist

	httpAddr := getenv("HTTP", ":8080")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go ehubReceiver(ctx, cfg.EhubPort)
	go artnetReceiver(ctx, cfg.ArtNetPort)
	go updater.routeLoop(ctx)

	srv := &http.Server{Addr: httpAddr, Handler: buildRouter()}

	idle := make(chan struct{})
	go func() {
		c := make(chan os.Signal, 1)
		signal.Notify(c, syscall.SIGINT, syscall.SIGTERM)
		<-c
		_ = srv.Shutdown(context.Background())
		cancel()
		close(idle)
	}()

	fmt.Println("listening on", httpAddr)
	if err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
		panic(err)
	}
	<-idle
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
