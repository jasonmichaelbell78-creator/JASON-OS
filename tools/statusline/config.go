package main

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/BurntSushi/toml"
)

type Config struct {
	General      GeneralConfig      `toml:"general"`
	Weather      WeatherConfig      `toml:"weather"`
	Timezone     TimezoneConfig     `toml:"timezone"`
	Thresholds   ThresholdsConfig   `toml:"thresholds"`
	Cache        CacheConfig        `toml:"cache"`
	Placeholders PlaceholdersConfig `toml:"placeholders"`
	APIKeys      APIKeysConfig      `toml:"api_keys"`
	Paths        PathsConfig        `toml:"paths"`
}

type GeneralConfig struct {
	Separator string `toml:"separator"`
	Lines     int    `toml:"lines"`
	ColorMode string `toml:"color_mode"`
}

type WeatherConfig struct {
	Location        string `toml:"location"`
	Units           string `toml:"units"`
	CacheTTLMinutes int    `toml:"cache_ttl_minutes"`
}

type TimezoneConfig struct {
	Zone   string `toml:"zone"`
	Format string `toml:"format"`
}

type ThresholdsConfig struct {
	ContextYellow     int `toml:"context_yellow"`
	ContextOrange     int `toml:"context_orange"`
	ContextRed        int `toml:"context_red"`
	RateLimitWarning  int `toml:"rate_limit_warning"`
	RateLimitCritical int `toml:"rate_limit_critical"`
}

type CacheConfig struct {
	FetchIntervalMinutes int    `toml:"fetch_interval_minutes"`
	RetryBackoff         []int  `toml:"retry_backoff"`
	StaleIndicator       string `toml:"stale_indicator"`
}

type PlaceholdersConfig struct {
	Task        string `toml:"task"`
	PR          string `toml:"pr"`
	CI          string `toml:"ci"`
	Unavailable string `toml:"unavailable"`
}

type APIKeysConfig struct {
	WeatherAPIKey string `toml:"weather_api_key"`
}

type PathsConfig struct {
	BinaryDir string `toml:"binary_dir"`
}

func defaultConfig() Config {
	return Config{
		General: GeneralConfig{
			Separator: "│",
			Lines:     3,
			ColorMode: "16",
		},
		Weather: WeatherConfig{
			Location:        "Nashville,TN,US",
			Units:           "imperial",
			CacheTTLMinutes: 5,
		},
		Timezone: TimezoneConfig{
			Zone:   "America/Chicago",
			Format: "15:04 CST",
		},
		Thresholds: ThresholdsConfig{
			ContextYellow:     50,
			ContextOrange:     65,
			ContextRed:        80,
			RateLimitWarning:  70,
			RateLimitCritical: 90,
		},
		Cache: CacheConfig{
			FetchIntervalMinutes: 5,
			RetryBackoff:         []int{1, 2, 5, 10},
			StaleIndicator:       "?",
		},
		Placeholders: PlaceholdersConfig{
			Task:        "task:none",
			PR:          "PR:none",
			CI:          "CI:none",
			Unavailable: "...",
		},
	}
}

// loadConfig reads config.toml from the binary's directory, then merges
// config.local.toml on top if it exists. Missing files are treated as
// "use defaults"; decode failures on existing files surface to stderr so
// a mangled config can't silently fall back to defaults.
func loadConfig(dir string) Config {
	cfg := defaultConfig()
	decodeIfPresent(filepath.Join(dir, "config.toml"), &cfg)
	decodeIfPresent(filepath.Join(dir, "config.local.toml"), &cfg)
	return cfg
}

// decodeIfPresent calls toml.DecodeFile directly and distinguishes expected
// "file absent" (silent) from a real decode error (logged to stderr).
// Avoids the os.Stat-then-DecodeFile TOCTOU pattern and prevents silent
// fall-through when a config file exists but is malformed.
func decodeIfPresent(path string, cfg *Config) {
	if _, err := toml.DecodeFile(path, cfg); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return
		}
		fmt.Fprintf(os.Stderr, "jason-statusline: failed to decode %s: %v\n", path, err)
	}
}
