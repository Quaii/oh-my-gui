"""Finder layout for the macOS preview built on headless runners."""

import json
from pathlib import Path

tauri = Path(defines["tauri"])
config = json.loads((tauri / "tauri.macos.conf.json").read_text(encoding="utf-8"))
layout = config["bundle"]["macOS"]["dmg"]
app = Path(defines["app"])
helper = tauri / "dmg/Open Preview.command"
files = [str(app), str(helper)]
symlinks = {"Applications": "/Applications"}
hide_extensions = [app.name, helper.name]
icon_locations = {
    app.name: (layout["appPosition"]["x"], layout["appPosition"]["y"]),
    "Applications": (
        layout["applicationFolderPosition"]["x"],
        layout["applicationFolderPosition"]["y"],
    ),
    helper.name: (layout["windowSize"]["width"] // 2, 310),
}
window_rect = ((100, 100), (layout["windowSize"]["width"], 410))
background = str(tauri / "dmg/preview-background.png")
icon_size = 96
format = "UDZO"
