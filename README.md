# AT Music Pro

<img src="/public/app_icon.png" style="max-width:100%; width:170px; border-radius: 40px; box-shadow: 0 20px 50px rgba(0,0,0,0.3);" /> 

  [![Platform](https://img.shields.io/badge/platform-Linux-blue?style=for-the-badge&logo=linux)](https://github.com/atishsharma/AT-Music-Player)
  [![Platform](https://img.shields.io/badge/platform-Windows-0078D4?style=for-the-badge&logo=windows)](https://github.com/atishsharma/AT-Music-Player)
  [![Electron](https://img.shields.io/badge/Electron-30-47848F?style=for-the-badge&logo=electron)](https://www.electronjs.org/)
  [![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
</div>

---

## ✨ Overview

**AT Music Pro** is a high-performance, aesthetically driven desktop music application built for the modern era. Combining local library management with seamless YouTube integration, it delivers a premium listening experience wrapped in a fluid, motion-rich interface.

---

## 🚀 Key Features

### 🎞️ Pro Mini Player
- **1:1 Square Design**: A compact, floating player that looks stunning on any desktop.
- **Interactive Lyrics Flip**: Click the album art to instantly reveal synced or plain lyrics in a beautiful typography-focused view.
- **Always-on-Top**: Keep your music and lyrics pinned while you work.

### 🌐 YouTube & Streaming
- **YouTube Engine**: Stream and search millions of tracks directly with intelligent **Opus/WebM** background caching.
- **Last.fm Scrobbling**: Real-time track logging and music discovery.
- **LRCLib Integration**: High-accuracy synced lyrics for almost any song in your library.

### 🎧 Library Management
- **Local Scanner**: Blazing-fast indexing of MP3, FLAC, WAV, and OGG collections.
- **Smart Queue**: Drag-and-drop reordering with persistent playback state.
- **Custom Grid**: Adjustable library thumbnail sizes (100px - 300px) with a real-time slider.

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Shell** | [Electron 30](https://www.electronjs.org/) | Cross-platform desktop runtime |
| **Framework** | [React 18](https://react.dev/) | Component-based UI architecture |
| **State** | [Zustand](https://github.com/pmndrs/zustand) | Lightweight, reactive state management |
| **Motion** | [Framer Motion](https://www.framer.com/motion/) | High-fidelity animations and transitions |
| **Build Tool** | [Vite 5](https://vitejs.dev/) | Modern frontend build pipeline |

---

## 📦 Getting Started

### Prerequisites

- **Node.js 20+**
- **FFmpeg**: System-level FFmpeg recommended for high-performance audio processing.
- **yt-dlp**: Required for YouTube metadata and streaming.

### Linux Build Requirements
On Arch-based systems (like CachyOS), you may need compatibility libraries for packaging:
```bash
sudo pacman -S libxcrypt-compat flatpak-builder snapd
```

---

## 📜 Build Scripts

| Command | Platform | Description |
|---|---|---|
| `npm run dev` | Core | Start development environment with HMR |
| `npm run build:linux` | Linux | Packages AppImage, .deb, and .snap |
| `npm run build:mac` | macOS | Packages Intel/Rosetta .zip archive |
| `npm run typecheck` | QA | Run full TypeScript integrity scan |

---

## 🛡️ License & Credits

Distributed under the **MIT License**.

### Powered by Open Source
- **[LRCLib](https://lrclib.net)** — Synced lyrics API
- **[yt-dlp](https://github.com/yt-dlp/yt-dlp)** — Media extraction engine
- **[Last.fm](https://last.fm)** — Scrobbling API
- **[MusicBrainz](https://musicbrainz.org)** — Metadata services

---

## 📂 User Data
- **Config & DB**: `~/.config/at-music-pro/`
- **Cache**: Audio streams and thumbnails are cached locally for offline responsiveness.

---

## Author

**Atish Ak Sharma** — [atishaksharma.com](https://atishaksharma.com)

---
MIT © 2026 AT Music Pro
