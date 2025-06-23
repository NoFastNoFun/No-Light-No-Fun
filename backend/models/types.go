package models

// Entity represents a Unity emitter entity.
type Entity struct {
	ID    int   `json:"id"`
	Color Color `json:"color"`
}

// Color represents an RGBW colour value.
type Color struct {
	R byte `json:"r"`
	G byte `json:"g"`
	B byte `json:"b"`
	W byte `json:"w"`
}

// Mapping links one Entity to output channels on a controller.
type Mapping struct {
	EntityID     int    `json:"entity_id"`
	ControllerIP string `json:"controller_ip"`
	Universe     int    `json:"universe"`
	ChannelStart int    `json:"channel_start"`
	ChannelCount int    `json:"channel_count"`
	UseR         bool   `json:"use_r"`
	UseG         bool   `json:"use_g"`
	UseB         bool   `json:"use_b"`
	UseW         bool   `json:"use_w"`
}

// Patch redirects a DMX channel.
type Patch struct {
	FromChannel int `json:"from_channel"`
	ToChannel   int `json:"to_channel"`
}

// Config is the user-editable project configuration.
type Config struct {
	Mappings        []Mapping `json:"mappings"`
	Patches         []Patch   `json:"patches"`
	Port            int       `json:"udp_port"`
	DefaultUniverse int       `json:"default_universe"`
	MaxFPS          int       `json:"max_fps"` // Throttle for Art-Net (25 default)
}
