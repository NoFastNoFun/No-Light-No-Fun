package models

// Entity represents a single visual object in the scene
type Entity struct {
	ID    int   `json:"id"`
	Color Color `json:"color"`
}

// Color defines RGBA(W) color channels
type Color struct {
	R byte `json:"r"`
	G byte `json:"g"`
	B byte `json:"b"`
	W byte `json:"w"` // Optional White channel
}

// Mapping links entities to DMX channels and a controller IP
type Mapping struct {
	EntityID     int    `json:"entity_id"`
	ControllerIP string `json:"controller_ip"`
	Universe     int    `json:"universe"`
	ChannelStart int    `json:"channel_start"`
	ChannelCount int    `json:"channel_count"` // usually 3 or 4
	UseR         bool   `json:"use_r"`
	UseG         bool   `json:"use_g"`
	UseB         bool   `json:"use_b"`
	UseW         bool   `json:"use_w"`
}

// Patch defines a channel-level redirection
type Patch struct {
	FromChannel int `json:"from_channel"`
	ToChannel   int `json:"to_channel"`
}

// Config defines a persisted configuration
type Config struct {
	Mappings []Mapping `json:"mappings"`
	Patches  []Patch   `json:"patches"`
	Universe int       `json:"default_universe"`
	Port     int       `json:"udp_port"`
}
