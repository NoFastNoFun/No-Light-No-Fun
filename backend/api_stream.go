package main

import (
	"context"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

var streamCancel context.CancelFunc

/* POST /api/stream (multipart) */
func postStream(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(32 << 20); err != nil { // 32 MB
		http.Error(w, err.Error(), 400)
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "missing file part", 400)
		return
	}
	defer file.Close()

	tmp, err := os.CreateTemp("", "wall-*"+filepath.Ext(header.Filename))
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer tmp.Close()
	if _, err = io.Copy(tmp, file); err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	// optional form fields
	getFloat := func(key string, def float64) float64 {
		if v := r.FormValue(key); v != "" {
			if f, _ := strconv.ParseFloat(v, 64); f > 0 {
				return f
			}
		}
		return def
	}
	getBool := func(key string, def bool) bool {
		if v := r.FormValue(key); v != "" {
			return v == "1" || strings.ToLower(v) == "true"
		}
		return def
	}
	getInt := func(key string, def int) int {
		if v := r.FormValue(key); v != "" {
			if n, _ := strconv.Atoi(v); n >= 0 {
				return n
			}
		}
		return def
	}

	spec := streamSpec{
		Path:       tmp.Name(),
		FPS:        getFloat("fps", 30),
		Brightness: getFloat("brightness", 1),
		Rotate:     getInt("rotate", 90),
		Serp:       getBool("serpentine", true),
		Loop:       getBool("loop", true),
	}

	// stop any previous stream
	if streamCancel != nil {
		streamCancel()
	}
	ctx, cancel := context.WithCancel(context.Background())
	streamCancel = cancel

	if err := startStreamer(ctx, spec); err != nil {
		cancel()
		http.Error(w, err.Error(), 500)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

/* DELETE /api/stream — stop current stream */
func deleteStream(w http.ResponseWriter, _ *http.Request) {
	if streamCancel != nil {
		streamCancel()
		streamCancel = nil
	}
	w.WriteHeader(http.StatusNoContent)
}
