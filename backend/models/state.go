package models

import "sync"

// EntityState stores latest colours keyed by **string** entity IDs.
type EntityState struct {
	mu sync.RWMutex
	m  map[string]Color
}

// NewEntityState returns an empty, threadsafe state map.
func NewEntityState() *EntityState {
	return &EntityState{m: make(map[string]Color)}
}

// Set updates one entity colour.
func (s *EntityState) Set(id string, c Color) {
	s.mu.Lock()
	s.m[id] = c
	s.mu.Unlock()
}

// Snapshot returns a copy of the map.
func (s *EntityState) Snapshot() map[string]Color {
	s.mu.RLock()
	out := make(map[string]Color, len(s.m))
	for k, v := range s.m {
		out[k] = v
	}
	s.mu.RUnlock()
	return out
}
