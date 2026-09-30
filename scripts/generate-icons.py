#!/usr/bin/env python3
"""
Generate every platform icon from public/app_icon.png.

Outputs (electron-builder `buildResources` = build/):
  build/icon.png          1024x1024 master (macOS / Linux fallback)
  build/icon.ico          Windows multi-size (16-256)
  build/icon.icns         macOS
  build/icons/NxN.png     Linux hicolor sizes

Requires Pillow:  pip install pillow
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "app_icon.png"
BUILD = ROOT / "build"
LINUX_SIZES = [16, 24, 32, 48, 64, 96, 128, 256, 512, 1024]
ICO_SIZES = [16, 20, 24, 32, 40, 48, 64, 96, 128, 256]

def square_master(size: int = 1024, fill: float = 0.92) -> Image.Image:
    """Centre the (non-square) badge on a transparent square canvas with a small margin."""
    src = Image.open(SRC).convert("RGBA")
    bbox = src.getbbox()
    if bbox:
        src = src.crop(bbox)
    scale = (size * fill) / max(src.size)
    art = src.resize((round(src.width * scale), round(src.height * scale)), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(art, ((size - art.width) // 2, (size - art.height) // 2), art)
    return canvas

def main() -> None:
    (BUILD / "icons").mkdir(parents=True, exist_ok=True)
    master = square_master()
    master.save(BUILD / "icon.png")
    for s in LINUX_SIZES:
        master.resize((s, s), Image.LANCZOS).save(BUILD / "icons" / f"{s}x{s}.png")
    master.save(BUILD / "icon.ico", sizes=[(s, s) for s in ICO_SIZES])
    master.save(BUILD / "icon.icns")
    print("Icons written to", BUILD)

if __name__ == "__main__":
    main()
