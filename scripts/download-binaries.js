#!/usr/bin/env node
/**
 * Download platform-specific yt-dlp and ffmpeg binaries into bin/ for bundling
 * (electron-builder copies bin/ to resources/bin via extraResources).
 *
 * Usage:
 *   node scripts/download-binaries.js                 # current platform + arch
 *   node scripts/download-binaries.js --win|--linux|--mac [--arch=x64|arm64]
 *   node scripts/download-binaries.js --no-ffmpeg     # yt-dlp only (default on Linux)
 *   node scripts/download-binaries.js --ffmpeg        # force bundling ffmpeg
 *
 * bin/ is cleaned first so a build never ships another platform's binaries.
 */
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const BIN_DIR = path.join(__dirname, '..', 'bin');

const YTDLP_URLS = {
    'linux-x64': 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux',
    'linux-arm64': 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux_aarch64',
    'win32-x64': 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
    'win32-arm64': 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
    'darwin-x64': 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos',
    'darwin-arm64': 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos',
};

// Tried in order. Linux builds skip ffmpeg by default (system package via deb/rpm/pacman
// dependencies) because a static Linux ffmpeg adds ~175MB.
const FFMPEG_URLS = {
    'linux-x64': ['https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz'],
    'linux-arm64': ['https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linuxarm64-gpl.tar.xz'],
    'win32-x64': [
        'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip',
        'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip',
    ],
    'win32-arm64': ['https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-winarm64-gpl.zip'],
    // x64 build runs under Rosetta on Apple Silicon
    'darwin-x64': ['https://evermeet.cx/ffmpeg/getrelease/zip'],
    'darwin-arm64': ['https://evermeet.cx/ffmpeg/getrelease/zip'],
};

function download(url, dest) {
    return new Promise((resolve, reject) => {
        console.log(`  ↓ ${url}`);
        const follow = (target, redirects = 0) => {
            if (redirects > 10) return reject(new Error('Too many redirects'));
            https.get(target, { headers: { 'User-Agent': 'at-music-pro-build' } }, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    res.resume();
                    return follow(new URL(res.headers.location, target).toString(), redirects + 1);
                }
                if (res.statusCode !== 200) {
                    res.resume();
                    return reject(new Error(`HTTP ${res.statusCode} for ${target}`));
                }
                const file = fs.createWriteStream(dest);
                res.pipe(file);
                file.on('finish', () => file.close(resolve));
                file.on('error', reject);
            }).on('error', reject);
        };
        follow(url);
    });
}

function findFile(dir, name) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            const hit = findFile(full, name);
            if (hit) return hit;
        } else if (entry.name === name) {
            return full;
        }
    }
    return null;
}

async function downloadYtDlp(key, isWin) {
    const dest = path.join(BIN_DIR, isWin ? 'yt-dlp.exe' : 'yt-dlp');
    await download(YTDLP_URLS[key], dest);
    if (!isWin) fs.chmodSync(dest, 0o755);
    console.log(`  ✓ yt-dlp → ${dest}`);
}

async function downloadFFmpegFrom(url, isWin) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ffmpeg-'));
    try {
        const archive = path.join(tmp, url.endsWith('.tar.xz') ? 'ffmpeg.tar.xz' : 'ffmpeg.zip');
        await download(url, archive);

        // bsdtar (Windows 10+, macOS) extracts zip; GNU tar on Linux needs unzip for it
        if (archive.endsWith('.zip') && process.platform === 'linux') {
            execFileSync('unzip', ['-q', '-o', archive, '-d', tmp]);
        } else {
            execFileSync('tar', ['-xf', archive, '-C', tmp]);
        }

        const name = isWin ? 'ffmpeg.exe' : 'ffmpeg';
        const found = findFile(tmp, name);
        if (!found) throw new Error(`ffmpeg binary not found in ${url}`);
        const dest = path.join(BIN_DIR, name);
        fs.copyFileSync(found, dest);
        if (!isWin) fs.chmodSync(dest, 0o755);
        console.log(`  ✓ ffmpeg → ${dest}`);
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
}

async function downloadFFmpeg(key, isWin) {
    let lastError;
    for (const url of FFMPEG_URLS[key]) {
        try {
            return await downloadFFmpegFrom(url, isWin);
        } catch (err) {
            lastError = err;
            console.warn(`  ⚠ ${err.message}`);
        }
    }
    throw lastError;
}

async function main() {
    const args = process.argv.slice(2);
    let platform = process.platform;
    if (args.includes('--win')) platform = 'win32';
    if (args.includes('--linux')) platform = 'linux';
    if (args.includes('--mac')) platform = 'darwin';
    const archArg = args.find(a => a.startsWith('--arch='));
    const arch = archArg ? archArg.split('=')[1] : process.arch;
    const key = `${platform}-${arch}`;
    const isWin = platform === 'win32';

    if (!YTDLP_URLS[key]) throw new Error(`Unsupported target ${key}`);

    fs.rmSync(BIN_DIR, { recursive: true, force: true });
    fs.mkdirSync(BIN_DIR, { recursive: true });

    console.log(`\n📦 Binaries for ${key}`);
    await downloadYtDlp(key, isWin);

    const wantFFmpeg = args.includes('--ffmpeg') || (platform !== 'linux' && !args.includes('--no-ffmpeg'));
    if (wantFFmpeg) {
        try {
            await downloadFFmpeg(key, isWin);
        } catch (err) {
            // Video mode degrades gracefully without ffmpeg (pre-merged streams only)
            console.warn(`  ⚠ ffmpeg skipped: ${err.message}`);
        }
    }
    console.log('✅ Done');
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
