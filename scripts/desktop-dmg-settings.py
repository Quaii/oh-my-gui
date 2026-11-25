"""Finder layout for the macOS preview built on headless runners."""

import json
from pathlib import Path

tauri = Path(defines["tauri"])
config = json.loads((tauri / "tauri.macos.conf.json").read_text(encoding="utf-8"))
layout = config["bundle"]["macOS"]["dmg"]
app = Path(defines["app"])
files = [str(app)]
symlinks = {"Applications": "/Applications"}
hide_extensions = [app.name]
icon_locations = {
    app.name: (layout["appPosition"]["x"], layout["appPosition"]["y"]),
    "Applications": (
        layout["applicationFolderPosition"]["x"],
        layout["applicationFolderPosition"]["y"],
    ),
}
window_rect = ((100, 100), (layout["windowSize"]["width"], layout["windowSize"]["height"]))
background = str(tauri / layout["background"])
icon_size = 96
format = "UDZO"
