package models

import "sync"

// EntityState stores the latest colour of every entity.
type EntityState struct {
	mu sync.RWMutex
	m  map[int]Color
}

// NewEntityState creates an empty state map.
func NewEntityState() *EntityState {
	return &EntityState{
		m: make(map[int]Color),
	}
}

// Set updates one entity colour.
func (s *EntityState) Set(id int, c Color) {
	s.mu.Lock()
	s.m[id] = c
	s.mu.Unlock()
}

// Snapshot returns a copy of the full map.
func (s *EntityState) Snapshot() map[int]Color {
	s.mu.RLock()
	out := make(map[int]Color, len(s.m))
	for k, v := range s.m {
		out[k] = v
	}
	s.mu.RUnlock()
	return out
}
