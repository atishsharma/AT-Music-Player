# AT Music Player — Pro

<img src="/public/app_icon.png" style="max-width:100%; width:170px;" /> 

✨ **A Premium Desktop Music Player With Local Music Library Management, YouTube Streaming and Last.fm Scrobbling.**

### Designed with ❤️ by **Atish Ak Sharma**

![Platform](https://img.shields.io/badge/platform-Linux-blue?logo=linux)
![Electron](https://img.shields.io/badge/Electron-30-47848F?logo=electron)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

- 🎵 **Local Library** — Scan and play local music files (MP3, FLAC, WAV, OGG)
- 📺 **YouTube Streaming** — Stream audio from YouTube via yt-dlp (opus/webm)
- 🎤 **Synced Lyrics** — Real-time scrolling lyrics via LRCLib
- 📻 **Last.fm Scrobbling** — Auto-scrobble everything you listen to
- 📥 **Downloads** — Download Songs directly to your library
- 🌙 **Zen / Fullscreen Mode** — Immersive visualizer experience
- 🎼 **Playlists** — Create and manage playlists
- 📖 **History** — Full playback history tracking
- ⚡ **Smart Caching** — Background audio caching for instant replay

---

## Tech Stack

| Layer | Technology |
|---|---|
| Shell | [Electron 30](https://www.electronjs.org/) |
| Frontend | [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| Build | [Vite 5](https://vitejs.dev/) + [vite-plugin-electron](https://github.com/electron-vite/vite-plugin-electron) |
| Styling | [Tailwind CSS 3](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/) |
| Database | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| Audio DL | [yt-dlp-exec](https://github.com/nickvdyck/yt-dlp-exec) |
| Metadata | [music-metadata](https://github.com/borewit/music-metadata) |
| Packaging | [electron-builder](https://www.electron.build/) |

---

## Prerequisites

- **Node.js** 18+ and **npm**
- **yt-dlp** installed and available in PATH: `sudo apt install yt-dlp` or `pip install yt-dlp`
- **ffmpeg** installed: `sudo apt install ffmpeg`

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/atishsharma/AT-Music-Player.git
cd AT-Music-Player

# Install dependencies (also rebuilds native modules for Electron)
npm install

# Start in development mode
npm run dev
```

---

## Building

```bash
# Build AppImage for Linux
npm run build:electron

# Output: release/<version>/AT Music Player - Pro-Linux-<version>.AppImage
```

Make the AppImage executable and run:

```bash
chmod +x "release/1.1.1/AT Music Player - Pro-Linux-1.1.1.AppImage"
"./release/1.1.1/AT Music Player - Pro-Linux-1.1.1.AppImage"
```

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




