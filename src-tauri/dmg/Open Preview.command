#!/bin/bash
set -eu

die() {
  printf '%s\n' "$*" >&2
  exit 1
}

image=$(/usr/bin/dirname "$0")
original="$image/Oh My GUI.app"
installed="/Applications/Oh My GUI.app"

[[ -d "$original" ]] || die 'Run Open Preview from the Oh My GUI disk image.'
[[ -d "$installed" && ! -L "$installed" ]] ||
  die 'Drag Oh My GUI to Applications, then open this helper again.'

signature=$(/usr/bin/codesign --display --verbose=4 "$original" 2>&1) ||
  die 'The preview on this disk image is missing its code signature.'
hash=$(printf '%s\n' "$signature" | /usr/bin/sed -n 's/^CDHash=//p')
[[ $hash =~ ^[0-9a-f]{40}$ ]] ||
  die 'Could not identify the preview on this disk image.'

/usr/bin/codesign --verify --deep --strict "$installed" ||
  die 'The installed app failed its integrity check. Download a fresh preview.'
/usr/bin/codesign --verify -R "identifier \"io.github.quaii.omp\" and cdhash H\"$hash\"" "$installed" ||
  die 'The installed app differs from this preview. Copy Oh My GUI from this disk image first.'

/usr/bin/xattr -r -s -d com.apple.quarantine "$installed" ||
  die 'Could not clear quarantine on this copy. Check that your account can modify it.'
/usr/bin/open "$installed" ||
  die 'The preview was verified, but macOS could not open it. Try opening it from Applications.'
