#!/bin/bash
# Fix permissions for chrome-sandbox if it exists
CHROME_SANDBOX="/opt/at-music-pro/chrome-sandbox"
if [ -f "$CHROME_SANDBOX" ]; then
    chmod 4755 "$CHROME_SANDBOX" || true
fi

# Provide a fallback for the app icon in standard desktop locations
ICON_SRC="/opt/at-music-pro/resources/app_icon.png"
ICON_DEST="/usr/share/icons/hicolor/512x512/apps/at-music-pro.png"

if [ -f "$ICON_SRC" ]; then
    mkdir -p /usr/share/icons/hicolor/512x512/apps
    cp "$ICON_SRC" "$ICON_DEST" || true
    chmod 644 "$ICON_DEST" || true
fi

# Update icon cache
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -f -t /usr/share/icons/hicolor || true
fi
