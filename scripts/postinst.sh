#!/bin/bash
# Post-install hook for deb / rpm / pacman packages.
# electron-builder installs to /opt/<productName>; locate it instead of hard-coding.
for DIR in "/opt/AT Music Pro" "/opt/at-music-pro"; do
    [ -d "$DIR" ] && APP_DIR="$DIR" && break
done
[ -z "$APP_DIR" ] && exit 0

# Command-line launcher
ln -sf "$APP_DIR/at-music-pro" /usr/bin/at-music-pro 2>/dev/null || true

# Icon fallback for desktops that don't pick up the packaged hicolor set
ICON_SRC="$APP_DIR/resources/app_icon.png"
if [ -f "$ICON_SRC" ]; then
    mkdir -p /usr/share/icons/hicolor/512x512/apps
    cp "$ICON_SRC" /usr/share/icons/hicolor/512x512/apps/at-music-pro.png || true
    chmod 644 /usr/share/icons/hicolor/512x512/apps/at-music-pro.png || true
fi

command -v gtk-update-icon-cache >/dev/null 2>&1 && gtk-update-icon-cache -f -t /usr/share/icons/hicolor || true
command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database -q /usr/share/applications || true
exit 0
