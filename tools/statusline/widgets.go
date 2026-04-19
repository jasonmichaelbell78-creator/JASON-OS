package main

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"
)

// WidgetResult holds the text and ANSI color code for a single widget.
type WidgetResult struct {
	Text  string
	Color string // ANSI escape, e.g. "\x1b[32m"
}

// AllWidgets holds the results for the 16 kept widgets, keyed by ID.
type AllWidgets struct {
	A1  WidgetResult // Model name
	A3  WidgetResult // Session duration
	A4  WidgetResult // Permission mode
	B1  WidgetResult // Git branch
	B2  WidgetResult // Project directory
	C1  WidgetResult // Context gauge
	C5  WidgetResult // Rate limit 5hr
	C6  WidgetResult // Rate limit 7d
	C7  WidgetResult // Rate limit reset
	C8  WidgetResult // Lines changed
	E1  WidgetResult // Current task (in-progress)
	F4  WidgetResult // Clock
	F6  WidgetResult // Weather current
	F7  WidgetResult // Weather forecast
	H2  WidgetResult // GitHub PR status
	H3  WidgetResult // CI/CD pipeline
}

// Color constants (ANSI 16-color)
const (
	colorReset   = "\x1b[0m"
	colorDim     = "\x1b[2m"
	colorBold    = "\x1b[1m"
	colorRed     = "\x1b[31m"
	colorGreen   = "\x1b[32m"
	colorYellow  = "\x1b[33m"
	colorBlue    = "\x1b[34m"
	colorMagenta = "\x1b[35m"
	colorCyan    = "\x1b[36m"
	colorWhite   = "\x1b[37m"
	colorBlink   = "\x1b[5;31m"
)

// Repeated string constants (SonarCloud dedup).
const (
	dotClaude    = ".claude"
	resetsPrefix = "resets "
)

// sanitize strips control characters and ANSI escapes, caps length.
var (
	csiRe = regexp.MustCompile("\x1b\\[[0-9;?]*[ -/]*[@-~]")
	oscRe = regexp.MustCompile("\x1b][^\x07]*\x07")
)

func sanitize(s string, maxLen int) string {
	// Strip ANSI CSI and OSC sequences
	s = csiRe.ReplaceAllString(s, "")
	s = oscRe.ReplaceAllString(s, "")
	// Strip control characters (U+0000-U+001F, U+007F-U+009F)
	var b strings.Builder
	for _, r := range s {
		if (r >= 0x20 && r < 0x7f) || r > 0x9f {
			b.WriteRune(r)
		}
	}
	s = b.String()
	if len([]rune(s)) > maxLen {
		s = string([]rune(s)[:maxLen])
	}
	return s
}

// Git branch cache (5-second TTL)
var (
	gitBranchCache     string
	gitBranchCacheTime time.Time
	gitBranchMu        sync.Mutex
)

func buildAllWidgets(data *StdinData, cfg *Config) *AllWidgets {
	w := &AllWidgets{}

	// Stdin-only widgets (zero I/O)
	w.A1 = widgetModelName(data)
	w.A3 = widgetSessionDuration(data)
	w.A4 = widgetPermissionMode(data)
	w.B2 = widgetProjectDir(data)
	w.C1 = widgetContextGauge(data, cfg)
	w.C5 = widgetRateLimit5hr(data, cfg)
	w.C6 = widgetRateLimit7d(data, cfg)
	w.C7 = widgetRateLimitReset(data, cfg)
	w.C8 = widgetLinesChanged(data)
	w.F4 = widgetClock(cfg)

	// Git branch (shell out, cached)
	w.B1 = widgetGitBranch(data)

	// File-read widget
	w.E1 = widgetCurrentTask(data, cfg)

	// API-backed widgets (read from cache files)
	w.F6 = widgetWeatherCurrent(cfg)
	w.F7 = widgetWeatherForecast(cfg)
	w.H2 = widgetGitHubPR(cfg)
	w.H3 = widgetCIPipeline(cfg)

	return w
}

// --- Stdin-only widgets ---

func widgetModelName(data *StdinData) WidgetResult {
	name := data.Model.DisplayName
	if name == "" {
		name = "Claude"
	}
	return WidgetResult{Text: sanitize(name, 30), Color: colorDim}
}

func widgetSessionDuration(data *StdinData) WidgetResult {
	ms := data.Cost.TotalDurationMs
	if ms <= 0 {
		return WidgetResult{Text: "0m", Color: colorDim}
	}
	dur := time.Duration(ms) * time.Millisecond
	h := int(dur.Hours())
	m := int(dur.Minutes()) % 60
	if h > 0 {
		return WidgetResult{Text: fmt.Sprintf("%dh%dm", h, m), Color: colorDim}
	}
	return WidgetResult{Text: fmt.Sprintf("%dm", m), Color: colorDim}
}

func widgetPermissionMode(data *StdinData) WidgetResult {
	mode := data.OutputStyle.Name
	if mode == "" {
		mode = "normal"
	}
	return WidgetResult{Text: "\u23f5\u23f5 " + sanitize(mode, 30), Color: colorDim}
}

func widgetProjectDir(data *StdinData) WidgetResult {
	dir := data.Workspace.CurrentDir
	if dir == "" {
		dir, _ = os.Getwd()
	}
	base := filepath.Base(dir)
	return WidgetResult{Text: sanitize(base, 30), Color: colorDim}
}

func widgetContextGauge(data *StdinData, cfg *Config) WidgetResult {
	if data.ContextWindow.UsedPercentage == nil {
		return WidgetResult{Text: cfg.Placeholders.Unavailable, Color: colorDim}
	}
	used := *data.ContextWindow.UsedPercentage
	used = math.Max(0, math.Min(100, used))
	filled := int(math.Floor(used / 10))
	if filled < 0 {
		filled = 0
	}
	if filled > 10 {
		filled = 10
	}
	bar := strings.Repeat("\u2588", filled) + strings.Repeat("\u2591", 10-filled)

	color := colorGreen
	text := fmt.Sprintf("%s %.0f%%", bar, used)
	if used >= float64(cfg.Thresholds.ContextRed) {
		color = colorBlink
		text = "\U0001F480 " + text
	} else if used >= float64(cfg.Thresholds.ContextOrange) {
		color = "\x1b[38;5;208m"
	} else if used >= float64(cfg.Thresholds.ContextYellow) {
		color = colorYellow
	}
	return WidgetResult{Text: text, Color: color}
}

func widgetRateLimit5hr(data *StdinData, cfg *Config) WidgetResult {
	if data.RateLimits.FiveHour.UsedPercentage == nil {
		return WidgetResult{Text: "5hr:" + cfg.Placeholders.Unavailable, Color: colorDim}
	}
	pct := *data.RateLimits.FiveHour.UsedPercentage
	color := colorGreen
	if pct >= float64(cfg.Thresholds.RateLimitCritical) {
		color = colorRed
	} else if pct >= float64(cfg.Thresholds.RateLimitWarning) {
		color = colorYellow
	}
	return WidgetResult{Text: fmt.Sprintf("5hr:%.0f%%", pct), Color: color}
}

func widgetRateLimit7d(data *StdinData, cfg *Config) WidgetResult {
	if data.RateLimits.SevenDay.UsedPercentage == nil {
		return WidgetResult{Text: "7d:" + cfg.Placeholders.Unavailable, Color: colorDim}
	}
	pct := *data.RateLimits.SevenDay.UsedPercentage
	color := colorGreen
	if pct >= float64(cfg.Thresholds.RateLimitCritical) {
		color = colorRed
	} else if pct >= float64(cfg.Thresholds.RateLimitWarning) {
		color = colorYellow
	}
	return WidgetResult{Text: fmt.Sprintf("7d:%.0f%%", pct), Color: color}
}

func widgetRateLimitReset(data *StdinData, cfg *Config) WidgetResult {
	raw := data.RateLimits.FiveHour.ResetsAt
	if len(raw) == 0 || string(raw) == "null" {
		return WidgetResult{Text: resetsPrefix + cfg.Placeholders.Unavailable, Color: colorDim}
	}
	t := parseTimestamp(raw)
	if t.IsZero() {
		return WidgetResult{Text: resetsPrefix + cfg.Placeholders.Unavailable, Color: colorDim}
	}
	loc, err := time.LoadLocation(cfg.Timezone.Zone)
	if err != nil {
		loc = time.Local
	}
	return WidgetResult{Text: resetsPrefix + t.In(loc).Format("3:04pm"), Color: colorDim}
}

// parseTimestamp handles both Unix timestamps (number) and RFC3339 strings.
func parseTimestamp(raw json.RawMessage) time.Time {
	// Try as number (Unix timestamp)
	var ts float64
	if err := json.Unmarshal(raw, &ts); err == nil && ts > 0 {
		return time.Unix(int64(ts), 0)
	}
	// Try as string (RFC3339)
	var s string
	if err := json.Unmarshal(raw, &s); err == nil && s != "" {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			return t
		}
	}
	return time.Time{}
}

func widgetLinesChanged(data *StdinData) WidgetResult {
	added := data.Cost.TotalLinesAdded
	removed := data.Cost.TotalLinesRemoved
	color := colorDim
	if added > 0 || removed > 0 {
		color = colorWhite
	}
	return WidgetResult{Text: fmt.Sprintf("+%d -%d", added, removed), Color: color}
}

func widgetClock(cfg *Config) WidgetResult {
	loc, err := time.LoadLocation(cfg.Timezone.Zone)
	if err != nil {
		loc = time.Local
	}
	now := time.Now().In(loc)
	return WidgetResult{Text: now.Format(cfg.Timezone.Format), Color: colorDim}
}

// --- Git branch widget ---

func widgetGitBranch(data *StdinData) WidgetResult {
	gitBranchMu.Lock()
	defer gitBranchMu.Unlock()

	if time.Since(gitBranchCacheTime) < 5*time.Second && gitBranchCache != "" {
		return WidgetResult{Text: gitBranchCache, Color: colorCyan}
	}

	dir := data.Workspace.CurrentDir
	if dir == "" {
		dir, _ = os.Getwd()
	}

	cmd := exec.Command("git", "rev-parse", "--abbrev-ref", "HEAD")
	cmd.Dir = dir
	cmd.Stderr = nil
	out, err := cmd.Output()
	if err != nil {
		return WidgetResult{Text: "", Color: ""}
	}

	branch := sanitize(strings.TrimSpace(string(out)), 40)
	gitBranchCache = branch
	gitBranchCacheTime = time.Now()
	return WidgetResult{Text: branch, Color: colorCyan}
}

// --- File-read widget ---

func widgetCurrentTask(data *StdinData, cfg *Config) WidgetResult {
	session := data.SessionID
	if session == "" {
		return WidgetResult{Text: cfg.Placeholders.Task, Color: colorDim}
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return WidgetResult{Text: cfg.Placeholders.Task, Color: colorDim}
	}

	todosDir := filepath.Join(home, dotClaude, "todos")
	todoFile := findLatestTodoFile(todosDir, session)
	if todoFile == "" {
		return WidgetResult{Text: cfg.Placeholders.Task, Color: colorDim}
	}

	// Path traversal guard
	resolved, err := filepath.Abs(filepath.Join(todosDir, todoFile))
	if err != nil {
		return WidgetResult{Text: cfg.Placeholders.Task, Color: colorDim}
	}
	absDir, _ := filepath.Abs(todosDir)
	if !strings.HasPrefix(resolved, absDir+string(filepath.Separator)) {
		return WidgetResult{Text: cfg.Placeholders.Task, Color: colorDim}
	}

	raw, err := os.ReadFile(resolved)
	if err != nil {
		return WidgetResult{Text: cfg.Placeholders.Task, Color: colorDim}
	}

	task := findInProgressTask(raw)
	if task == "" {
		return WidgetResult{Text: cfg.Placeholders.Task, Color: colorDim}
	}
	return WidgetResult{Text: task, Color: colorBold}
}

// findLatestTodoFile returns the filename of the most recently modified
// agent todo file matching the given session, or "" if none found.
func findLatestTodoFile(todosDir, session string) string {
	entries, err := os.ReadDir(todosDir)
	if err != nil {
		return ""
	}

	type fileInfo struct {
		name string
		mod  time.Time
	}
	var matches []fileInfo
	for _, e := range entries {
		n := e.Name()
		if strings.HasPrefix(n, session) && strings.Contains(n, "-agent-") && strings.HasSuffix(n, ".json") {
			info, err := e.Info()
			if err != nil {
				continue
			}
			matches = append(matches, fileInfo{name: n, mod: info.ModTime()})
		}
	}
	if len(matches) == 0 {
		return ""
	}
	sort.Slice(matches, func(i, j int) bool {
		return matches[i].mod.After(matches[j].mod)
	})
	return matches[0].name
}

// findInProgressTask parses a todo JSON array and returns the sanitized
// activeForm of the first in-progress task, or "" if none found.
func findInProgressTask(raw []byte) string {
	var todos []struct {
		Status     string `json:"status"`
		ActiveForm string `json:"activeForm"`
	}
	if err := json.Unmarshal(raw, &todos); err != nil {
		return ""
	}
	for _, t := range todos {
		if t.Status == "in_progress" {
			text := sanitize(t.ActiveForm, 50)
			if text == "" {
				text = "(in progress)"
			}
			return text
		}
	}
	return ""
}
