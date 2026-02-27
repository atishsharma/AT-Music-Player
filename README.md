# AT Music Player — Pro Edition

<img src="/public/app_icon.png" style="max-width:100%; width:170px;" /> 

  [![Platform](https://img.shields.io/badge/platform-Linux-blue?style=for-the-badge&logo=linux)](https://github.com/atishsharma/AT-Music-Player)
  [![Platform](https://img.shields.io/badge/platform-Windows-0078D4?style=for-the-badge&logo=windows)](https://github.com/atishsharma/AT-Music-Player)
  [![Electron](https://img.shields.io/badge/Electron-30-47848F?style=for-the-badge&logo=electron)](https://www.electronjs.org/)
  [![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
</div>

---

## ✨ Overview

**AT Music Player** is a state-of-the-art desktop music application designed for audiophiles who demand both functionality and beauty. Built with Electron, React, and Vite, it supports both **Linux** and **Windows** platforms, providing a fluid, responsive experience.

---

## 🚀 Key Features

### 🎧 Pure Playback
- **Cross-Platform**: Full support for Linux and Windows desktop environments.
- **Local Library**: Instantly scan and organize thousands of files (MP3, FLAC, WAV, OGG).
- **YouTube Engine**: Stream audio directly from YouTube with intelligent webm/opus caching.

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Shell** | [Electron 30](https://www.electronjs.org/) | Cross-platform desktop environment |
| **Framework** | [React 18](https://react.dev/) | Component-based UI architecture |
| **Build Tool** | [Vite 5](https://vitejs.dev/) | Ultra-fast development and bundling |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | Modern utility-first CSS |

---

## 📦 Getting Started

### Prerequisites

- **Node.js 18+**
- **FFmpeg**: Required for audio processing
- **yt-dlp**: Required for YouTube streaming

---

## 🛡️ License & Credits

Distributed under the **MIT License**.

### Powered by Open Source
- **[React](https://react.dev)** — Frontend framework
- **[Vite](https://vitejs.dev)** — Build tool
- **[LRCLib](https://lrclib.net)** — Synced lyrics API
- **[yt-dlp](https://github.com/yt-dlp/yt-dlp)** — Media extraction
- **[Last.fm](https://last.fm)** — Music discovery and tracking
- **[MusicBrainz](https://musicbrainz.org)** — Open music encyclopedia
- **[Node.js](https://nodejs.org)** & **[TypeScript](https://www.typescriptlang.org)** — The core foundations

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Build renderer only (Vite) |
| `npm run build:electron` | Full production build → AppImage |
| `npm run rebuild-native` | Rebuild `better-sqlite3` for current Electron |

---

## Project Structure

```
AT-Music-Player/
├── electron/               # Main process (Node.js/Electron)
│   ├── main.ts             # App entry, window creation, protocol handler
│   ├── preload.ts          # Context bridge
│   ├── db/                 # SQLite database schema & queries
│   ├── ipc/                # IPC handler registration
│   └── services/           # Business logic
│       ├── ytdlp.ts        # YouTube streaming & download
│       ├── scanner.ts      # Local music library scanner
│       ├── downloader.ts   # Download manager
│       ├── lyrics.ts       # LRCLib lyrics fetching
│       ├── lastfm.ts       # Last.fm scrobbling
│       ├── spotify.ts      # Spotify API integration
│       └── ...
├── src/                    # Renderer process (React)
│   ├── components/         # UI components
│   ├── stores/             # Zustand state stores
│   ├── views/              # Page-level views
│   └── App.tsx
├── public/                 # Static assets
├── electron-builder.json5  # Packaging config
├── vite.config.ts
└── package.json
```

---

## Notes

- **YouTube audio** is streamed/cached in **opus/webm** format — this is intentional. Standard Electron does not ship proprietary AAC/H264 codecs; opus is royalty-free and fully supported.
- The app uses `--no-sandbox` on Linux to avoid Chromium sandbox SUID requirements on most distros.
- User data (database, audio cache) is stored in `~/.config/at-music-pro/`.

---

## Author

**Atish Ak Sharma** — [atishaksharma.com](https://atishaksharma.com)

---

## License

MIT





