import YoutubeDl from 'yt-dlp-exec';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

const CACHE_DIR = path.join(app.getPath('userData'), 'cache', 'audio');

if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export async function cacheAudio(videoId: string) {
    const filePath = path.join(CACHE_DIR, `${videoId}.m4a`);

    if (fs.existsSync(filePath)) {
        return filePath;
    }

    try {
        await YoutubeDl(`https://www.youtube.com/watch?v=${videoId}`, {
            output: filePath,
            format: 'bestaudio[ext=m4a]/bestaudio/best',
            noWarnings: true,
        });
        return filePath;
    } catch (error) {
        console.error('Audio Caching Error:', error);
        return null;
    }
}

export function getCachedAudioPath(videoId: string) {
    const filePath = path.join(CACHE_DIR, `${videoId}.m4a`);
    return fs.existsSync(filePath) ? filePath : null;
}
