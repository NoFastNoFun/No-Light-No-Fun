package main

import (
	"encoding/json"
	"net/http"
)

/* POST /api/faker  — start or replace pattern */
func postFaker(w http.ResponseWriter, r *http.Request) {
	var req fakerReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), 400)
		return
	}
	if err := fake.start(req); err != nil {
		http.Error(w, err.Error(), 400)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

/* DELETE /api/faker  — stop generator */
func deleteFaker(w http.ResponseWriter, _ *http.Request) {
	fake.stop()
	w.WriteHeader(http.StatusNoContent)
}
