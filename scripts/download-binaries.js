#!/usr/bin/env node
/**
 * Download platform-specific ffmpeg and yt-dlp binaries for bundling.
 * 
 * Usage:
 *   node scripts/download-binaries.js           # Downloads for current platform
 *   node scripts/download-binaries.js --all     # Downloads for all platforms
 *   node scripts/download-binaries.js --linux   # Downloads for Linux x64
 *   node scripts/download-binaries.js --win     # Downloads for Windows x64
 *   node scripts/download-binaries.js --mac     # Downloads for macOS x64
 */
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BIN_DIR = path.join(__dirname, '..', 'bin');

const YTDLP_URLS = {
    linux: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux',
    win32: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
    darwin: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos',
};

const FFMPEG_URLS = {
    linux: 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz',
    win32: 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip',
    darwin: 'https://evermeet.cx/ffmpeg/getrelease/zip',
};

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function download(url, dest) {
    return new Promise((resolve, reject) => {
        console.log(`  Downloading: ${url}`);
        const follow = (url, redirects = 0) => {
            if (redirects > 10) return reject(new Error('Too many redirects'));
            const client = url.startsWith('https') ? https : http;
            client.get(url, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    return follow(res.headers.location, redirects + 1);
                }
                if (res.statusCode !== 200) {
                    return reject(new Error(`HTTP ${res.statusCode}`));
                }
                const file = fs.createWriteStream(dest);
                res.pipe(file);
                file.on('finish', () => { file.close(); resolve(); });
                file.on('error', reject);
            }).on('error', reject);
        };
        follow(url);
    });
}

async function downloadYtDlp(platform) {
    const url = YTDLP_URLS[platform];
    if (!url) { console.log(`  No yt-dlp binary for ${platform}`); return; }

    const isWin = platform === 'win32';
    const dest = path.join(BIN_DIR, isWin ? 'yt-dlp.exe' : 'yt-dlp');

    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
        console.log(`  yt-dlp already exists for ${platform}, skipping.`);
        return;
    }

    await download(url, dest);

    if (!isWin) {
        fs.chmodSync(dest, 0o755);
    }
    console.log(`  ✓ yt-dlp for ${platform} saved to ${dest}`);
}

async function downloadFFmpeg(platform) {
    console.log(`  FFmpeg download for ${platform}:`);
    console.log(`  Note: FFmpeg binaries are large. For production builds,`);
    console.log(`  consider downloading manually from https://ffmpeg.org/download.html`);
    console.log(`  and placing the binary in the bin/ directory.`);

    const isWin = platform === 'win32';
    const dest = path.join(BIN_DIR, isWin ? 'ffmpeg.exe' : 'ffmpeg');

    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
        console.log(`  ffmpeg already exists for ${platform}, skipping.`);
        return;
    }

    // For Linux, try to copy system ffmpeg
    if (platform === 'linux') {
        try {
            const syspath = execSync('which ffmpeg', { encoding: 'utf8' }).trim();
            if (syspath && fs.existsSync(syspath)) {
                fs.copyFileSync(syspath, dest);
                fs.chmodSync(dest, 0o755);
                console.log(`  ✓ Copied system ffmpeg to ${dest}`);
                return;
            }
        } catch { /* ignore */ }
    }

    if (platform === 'darwin') {
        try {
            const syspath = execSync('which ffmpeg', { encoding: 'utf8' }).trim();
            if (syspath && fs.existsSync(syspath)) {
                fs.copyFileSync(syspath, dest);
                fs.chmodSync(dest, 0o755);
                console.log(`  ✓ Copied system ffmpeg to ${dest}`);
                return;
            }
        } catch { /* ignore */ }
    }

    console.log(`  ⚠ Please manually download ffmpeg for ${platform} and place in bin/`);
}

async function main() {
    const args = process.argv.slice(2);
    let platforms = [process.platform];

    if (args.includes('--all')) {
        platforms = ['linux', 'win32', 'darwin'];
    } else if (args.includes('--linux')) {
        platforms = ['linux'];
    } else if (args.includes('--win')) {
        platforms = ['win32'];
    } else if (args.includes('--mac')) {
        platforms = ['darwin'];
    }

    ensureDir(BIN_DIR);

    for (const platform of platforms) {
        console.log(`\n📦 Downloading binaries for ${platform}...`);
        await downloadYtDlp(platform);
        await downloadFFmpeg(platform);
    }

    console.log('\n✅ Done! Binaries are in the bin/ directory.');
    console.log('They will be bundled into the app via electron-builder extraResources.');
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
