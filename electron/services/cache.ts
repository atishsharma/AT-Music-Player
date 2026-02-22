import { execYtDlp } from '../utils/ytdlp-bin';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

// Resolve cache dir lazily so app.getPath() is only called after Electron app is ready
function getCacheDir(): string {
    const cacheDir = path.join(app.getPath('userData'), 'cache', 'audio');
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }
    return cacheDir;
}

export async function cacheAudio(videoId: string) {
    const CACHE_DIR = getCacheDir();
    const filePath = path.join(CACHE_DIR, `${videoId}.m4a`);

    if (fs.existsSync(filePath)) {
        return filePath;
    }

    try {
        const subprocess = execYtDlp([
            `https://www.youtube.com/watch?v=${videoId}`,
            '--output', filePath,
            '--format', 'bestaudio[ext=m4a]/bestaudio/best',
            '--no-warnings'
        ]);

        await new Promise((resolve, reject) => {
            subprocess.on('close', (code) => code === 0 ? resolve(true) : reject(new Error(`Exit ${code}`)));
            subprocess.on('error', reject);
        });

        return filePath;
    } catch (error) {
        console.error('Audio Caching Error:', error);
        return null;
    }
}

export function getCachedAudioPath(videoId: string) {
    const CACHE_DIR = getCacheDir();
    const filePath = path.join(CACHE_DIR, `${videoId}.m4a`);
    return fs.existsSync(filePath) ? filePath : null;
}
