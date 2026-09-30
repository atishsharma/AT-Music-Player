#!/bin/bash
# AT Music Pro — desktop integration for the portable Linux archive (.tar.gz).
# Adds a menu entry, the app icon and an `at-music-pro` command for the current user.
#   ./install.sh             install
#   ./install.sh --uninstall remove the menu entry, icon and command (keeps this folder)
set -e

DIR="$(dirname "$(readlink -f "$0")")"
APPS="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
ICONS="${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor/512x512/apps"
BIN="$HOME/.local/bin"
DESKTOP="$APPS/at-music-pro.desktop"

if [ "$1" = "--uninstall" ]; then
    rm -f "$DESKTOP" "$ICONS/at-music-pro.png" "$BIN/at-music-pro"
    command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database -q "$APPS" || true
    echo "AT Music Pro removed from the menu. Delete $DIR to remove the app itself."
    exit 0
fi

chmod +x "$DIR/at-music-pro" "$DIR/at-music-pro.bin" "$DIR/chrome_crashpad_handler" 2>/dev/null || true
mkdir -p "$APPS" "$ICONS" "$BIN"
cp "$DIR/resources/app_icon.png" "$ICONS/at-music-pro.png"
ln -sf "$DIR/at-music-pro" "$BIN/at-music-pro"

cat > "$DESKTOP" <<DESK
[Desktop Entry]
Type=Application
Name=AT Music Pro
Comment=Premium music player with Last.fm and YouTube integration
Exec="$DIR/at-music-pro" %U
Icon=at-music-pro
Terminal=false
Categories=Audio;Music;Player;AudioVideo;
StartupWMClass=at-music-pro
Keywords=music;player;audio;youtube;lyrics;
DESK
chmod +x "$DESKTOP"

command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database -q "$APPS" || true
command -v gtk-update-icon-cache >/dev/null 2>&1 && gtk-update-icon-cache -q -t "${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor" || true

echo "AT Music Pro installed. Open it from your app menu, or run: at-music-pro"
case ":$PATH:" in *":$BIN:"*) ;; *) echo "(Add $BIN to your PATH to use the at-music-pro command.)";; esac
