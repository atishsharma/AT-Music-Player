# 🎶 AT Music Pro - Premium Music Player ❤️

<div align="center">
<img src="/public/app_icon.png" style="max-width:100%; width:170px; border-radius: 40px; box-shadow: 0 20px 20px rgba(0,0,0,0.3);" /> 

  [![Platform](https://img.shields.io/badge/platform-Linux-blue?style=for-the-badge&logo=linux)](https://github.com/atishsharma/AT-Music-Player)
  [![Platform](https://img.shields.io/badge/platform-macOS-lightgrey?style=for-the-badge&logo=apple)](https://github.com/atishsharma/AT-Music-Player)
  [![Platform](https://img.shields.io/badge/platform-Windows-0078D4?style=for-the-badge&logo=windows)](https://github.com/atishsharma/AT-Music-Player)
  [![Electron](https://img.shields.io/badge/Electron-30-47848F?style=for-the-badge&logo=electron)](https://www.electronjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
</div>

---

## ✨ Overview
**AT Music Pro** is a high-performance, aesthetically driven desktop music application built for the modern era. Combining local library management with seamless YouTube integration, it delivers a premium listening experience wrapped in a fluid, motion-rich interface.

<div align="center">
  <h3>🎯 Experience the Interface</h3>
  
  <p align="center">
    <img src="/pics/Image-13.png" width="85%" style="border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.4);" alt="Main Dashboard Dashboard" />
    <br><i>The Main Dashboard: Blending local library power with global discovery.</i>
  </p>
  
  <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
    <div style="flex: 1; min-width: 300px; text-align: center;">
      <img src="/pics/Image-10.png" width="95%" style="border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.4);" alt="Pro Mini Player" />
      <br><i>Floating Mini Player & Synced Lyrics</i>
    </div>
    <div style="flex: 1; min-width: 300px; text-align: center;">
      <img src="/pics/Image-02.png" width="95%" style="border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.4);" alt="YouTube Search" />
      <br><i>Main Home Page With Lyrics Side Opened</i>
    </div>
  </div>
</div>

---

## 🚀 Release 1.2.1 - The Premium Update
This release focuses on **Layout Independence**, **Native Stability**, and **Linux Optimization**.

- **Mini Player 2.0:** Completely independent layout scaling. 80% optimized zoom on Linux for perfect pixel clarity.
- **Dynamic Resizing:** Proportional window scaling (380:712) for the Mini Player. 
- **Linux Sandbox Fix:** Integrated `--no-sandbox` and `--disable-gpu-sandbox` for universal compatibility across Ubuntu, Arch, and Fedora.
- **Sidebar UX:** Persistent sidebar state (open by default) for faster navigation.

---

## ✨ Key Features

### 🎞️ Pro Mini Player
- **1:1 Square Design**: A compact, floating player that looks stunning on any desktop.
- **Interactive Lyrics Flip**: Click the album art to instantly reveal synced or plain lyrics in a beautiful typography-focused view.
- **Always-on-Top**: Keep your music and lyrics pinned while you work.
- **Proportional Scaling**: Maintain the perfect vertical aspect ratio even when resizing.

### 🌐 YouTube & Streaming
- **YouTube Engine**: Stream and search millions of tracks directly with intelligent **Opus/WebM** background caching.
- **Last.fm Scrobbling**: Real-time track logging and music discovery.
- **LRCLib Integration**: High-accuracy synced lyrics for almost any song in your library.

### 🎧 Library Management
- **Local Scanner**: Blazing-fast indexing of MP3, FLAC, WAV, and OGG collections.
- **Smart Queue**: Drag-and-drop reordering with persistent playback state.
- **Custom Grid**: Adjustable library thumbnail sizes (100px - 300px) with a real-time slider.

---

### Prerequisites
* Node.js 18+
* FFmpeg: Required for audio processing
* yt-dlp: Required for YouTube streaming

### ⚙️ Installing Prerequisites
To ensure audio processing and YouTube streaming function correctly, you must install **FFmpeg** and **yt-dlp** on your system and ensure they are available in your system's PATH.

Choose your operating system below for installation instructions:

#### 🪟 Windows

**Using [Winget](https://learn.microsoft.com/en-us/windows/package-manager/winget/) (Recommended)**
Open Command Prompt or PowerShell and run:
```cmd
winget install ffmpeg
winget install yt-dlp
```

**Using [Chocolatey](https://chocolatey.org/)**
Run as Administrator in PowerShell:
```cmd
choco install ffmpeg yt-dlp
```
*(Note: You may need to restart your terminal after installation so the newly installed tools are recognized.)*

#### 🐧 Linux

**Ubuntu / Debian-based distros**
```bash
sudo apt update
sudo apt install ffmpeg

# It is highly recommended to fetch the latest yt-dlp directly from their repository:
sudo wget [https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp](https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp) -O /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

**Arch Linux**
```bash
sudo pacman -S ffmpeg yt-dlp
```

**Fedora**
```bash
sudo dnf install ffmpeg yt-dlp
```

#### 🍎 macOS

**Using [Homebrew](https://brew.sh/)**
Open your terminal and run:
```bash
brew install ffmpeg yt-dlp
```

---
**Verification:**
To verify the installations were successful, open a new terminal window and run:
```bash
ffmpeg -version
yt-dlp --version
```
If both commands return version information, you are ready to start using AT Music Player!

___

## 🛠 Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Shell** | [Electron 30](https://www.electronjs.org/) | Cross-platform desktop runtime |
| **Logic** | [TypeScript 5](https://www.typescriptlang.org/) | Strong typing and modern JS features |
| **Framework** | [React 18](https://react.dev/) | Component-based UI architecture |
| **State** | [Zustand](https://github.com/pmndrs/zustand) | Lightweight, reactive state management |
| **Motion** | [Framer Motion](https://www.framer.com/motion/) | High-fidelity animations and transitions |
| **Build Tool** | [Vite 5](https://vitejs.dev/) | Modern frontend build pipeline |

---

## 📦 Getting Started

### **Installation**

#### **🍎 macOS (zip)**
Download `AT-Music-Pro-Mac-1.2.1-Installer.zip`, unzip, and drag to Applications.

#### **🪟 Windows (zip)**
Download `AT-Music-Pro-Windows-1.2.1.zip` and run `AT Music Pro.exe`.

#### **🐧 Linux**
- **AppImage:** Make executable and run.
- **Debian/Ubuntu (.deb):** `sudo dpkg -i AT-Music-Pro-Linux-1.2.1.deb`
- **Snap:** `sudo snap install AT-Music-Pro-Linux-1.2.1.snap --dangerous --classic`
- **Arch Linux (.pkg.tar.zst):** `sudo pacman -U AT-Music-Pro-Linux-1.2.1-1-x86_64.pkg.tar.zst`

---

## 🏗️ Building from Source
Follow these steps to test or modify the application:

1. **Clone & Install**
   ```bash
   git clone https://github.com/atishsharma/AT-Music-Player.git
   cd AT-Music-Player
   npm install
   ```

2. **Development Mode**
   ```bash
   npm run dev
   ```

3. **Production Build**
   - **Windows:** `npm run build:win`
   - **Linux:** `npm run build:linux` (AppImage, Deb, Snap)
   - **macOS:** `npm run build:mac`

---

## 🛡️ License & Credits
Distributed under the **MIT License**.

### Powered by Open Source
- **[LRCLib](https://lrclib.net)** — Synced lyrics API
- **[yt-dlp](https://github.com/yt-dlp/yt-dlp)** — Media extraction engine
- **[Last.fm](https://last.fm)** — Scrobbling API
- **[MusicBrainz](https://musicbrainz.org)** — Metadata services

---

## 📂 User Data Locations
AT Music Pro stores your library database and preferences based on your OS:

- **Linux:** `~/.config/at-music-pro/`
- **macOS:** `~/Library/Application Support/at-music-pro/`
- **Windows:** `%APPDATA%/at-music-pro/`

---

## Author
**Atish Ak Sharma ❤️ ** — [atishaksharma.com](https://atishaksharma.com)

---
MIT © 2026 AT Music Pro
