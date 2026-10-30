package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()
	if err := wails.Run(&options.App{
		Title: "Data Viewer",
		Width: 1440, Height: 960,
		MinWidth: 900, MinHeight: 640,
		BackgroundColour: &options.RGBA{R: 238, G: 242, B: 246, A: 255},
		AssetServer:      &assetserver.Options{Assets: assets},
		OnStartup:        app.startup,
		Bind:             []interface{}{app},
	}); err != nil {
		log.Fatal(err)
	}
}
