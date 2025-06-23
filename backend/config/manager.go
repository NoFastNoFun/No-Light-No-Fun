package config

import (
	"encoding/json"
	"io/ioutil"
	"nolightnofun/models"
)

// LoadConfig loads the configuration from a JSON file
func LoadConfig(path string) (models.Config, error) {
	data, err := ioutil.ReadFile(path)
	if err != nil {
		return models.Config{}, err
	}

	var cfg models.Config
	err = json.Unmarshal(data, &cfg)
	return cfg, err
}

// SaveConfig saves the configuration to a JSON file
func SaveConfig(path string, cfg models.Config) error {
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}

	return ioutil.WriteFile(path, data, 0644)
}
