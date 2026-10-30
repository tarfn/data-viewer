package main

import "context"

// App is the desktop bridge. Database capabilities will be added in later slices.
type App struct {
	ctx context.Context
}

func NewApp() *App { return &App{} }

func (a *App) startup(ctx context.Context) { a.ctx = ctx }

// AppInfo describes the shell only; it does not report database connectivity.
type AppInfo struct {
	Name    string `json:"name"`
	Version string `json:"version"`
	Mode    string `json:"mode"`
}

func (a *App) Info() AppInfo {
	return AppInfo{Name: "Data Viewer", Version: "0.0.1", Mode: "ui-preview"}
}
