import { execYtDlp, execYtDlpJson } from '../utils/ytdlp-bin';
import { app, WebContents } from 'electron';
import path from 'path';
import fs from 'fs';

// Track the active cache download so we can cancel it
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let activeCacheProcess: any = null;
let activeCacheVideoId: string | null = null;

// Ensure cache directory exists
const getCacheDir = () => {
    const userData = app.getPath('userData');
    const cacheDir = path.join(userData, 'audio_cache');
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }
    return cacheDir;
};

export async function searchYouTube(query: string, limit: number = 7) {
    try {
        const musicQuery = `${query} music`;
        const output = await execYtDlpJson([
            `ytsearch${limit}:${musicQuery}`,
            '--flat-playlist',
            '--format', 'bestaudio'
        ]);

        if (output && output.entries) {
            return output.entries
                .filter((entry: any) => entry.id)
                .map((entry: any) => ({
                    id: entry.id,
                    title: entry.title,
                    artist: entry.uploader || 'Unknown Artist',
                    duration: entry.duration,
                    thumbnail: entry.thumbnail || `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`,
                    date: entry.upload_date ? `${entry.upload_date.slice(0, 4)}-${entry.upload_date.slice(4, 6)}-${entry.upload_date.slice(6, 8)}` : '',
                    source: 'youtube'
                }));
        }
        return [];
    } catch (error) {
        console.error('YouTube Search Error:', error);
        return [];
    }
}

export async function searchYTMusic(query: string, limit: number = 20) {
    try {
        const output = await execYtDlpJson([
            `https://music.youtube.com/search?q=${encodeURIComponent(query)}`,
            '--flat-playlist'
        ]);

        if (output && output.entries) {
            return output.entries.slice(0, limit).map((entry: any) => ({
                id: entry.id,
                title: entry.title,
                artist: entry.uploader || entry.artist || entry.creator || 'Unknown Artist',
                duration: entry.duration,
                thumbnail: entry.thumbnail || (entry.thumbnails && entry.thumbnails[0]?.url),
                date: entry.upload_date ? `${entry.upload_date.slice(0, 4)}-${entry.upload_date.slice(4, 6)}-${entry.upload_date.slice(6, 8)}` : '',
                source: 'ytmusic'
            }));
        }

        const fallback = await execYtDlpJson([
            `ytsearch${limit}:${query} official audio`,
            '--flat-playlist'
        ]);

        if (fallback && fallback.entries) {
            return fallback.entries.map((entry: any) => ({
                id: entry.id,
                title: entry.title,
                artist: entry.uploader || 'Unknown Artist',
                duration: entry.duration,
                thumbnail: entry.thumbnail,
                date: entry.upload_date ? `${entry.upload_date.slice(0, 4)}-${entry.upload_date.slice(4, 6)}-${entry.upload_date.slice(6, 8)}` : '',
                source: 'ytmusic'
            }));
        }

        return [];
    } catch (error) {
        console.error('YT Music Search Error:', error);
        return [];
    }
}

async function downloadToCache(videoId: string, targetPath: string) {
    const tempPath = `${targetPath}.part`;
    try {
        console.log(`Starting background download for ${videoId}`);

        const subprocess = execYtDlp([
            `https://www.youtube.com/watch?v=${videoId}`,
            '--no-warnings',
            '--output', tempPath,
            '--format', 'bestaudio[ext=webm]/bestaudio[acodec=opus]/bestaudio'
        ]);

        await new Promise((resolve, reject) => {
            subprocess.on('close', (code) => code === 0 ? resolve(true) : reject(new Error(`Exit ${code}`)));
            subprocess.on('error', reject);
        });

        // Rename if successful
        if (fs.existsSync(tempPath)) {
            const stats = fs.statSync(tempPath);
            if (stats.size > 10000) {
                fs.renameSync(tempPath, targetPath);
                console.log(`Download complete and renamed for ${videoId}`);
            } else {
                console.warn(`Download too small (${stats.size} bytes), ignoring.`);
                fs.unlinkSync(tempPath);
            }
        }
    } catch (err) {
        console.error(`Background download failed for ${videoId}:`, err);
        if (fs.existsSync(tempPath)) {
            try { fs.unlinkSync(tempPath); } catch (e) { /* Ignore */ }
        }
    }
}

export async function getStreamUrl(videoId: string) {
    try {
        const cacheDir = getCacheDir();
        const webmPath = path.join(cacheDir, `${videoId}.webm`);
        const opusPath = path.join(cacheDir, `${videoId}.opus`);
        const mp3Path = path.join(cacheDir, `${videoId}.mp3`);

        let localPath = null;
        if (fs.existsSync(webmPath)) localPath = webmPath;
        else if (fs.existsSync(opusPath)) localPath = opusPath;
        else if (fs.existsSync(mp3Path)) localPath = mp3Path;

        if (localPath) {
            const stats = fs.statSync(localPath);
            if (stats.size > 10000) {
                console.log(`Serving from cache: ${localPath}`);
                return {
                    url: `atmusic://${localPath}`,
                    format: 'local'
                };
            } else {
                try { fs.unlinkSync(localPath); } catch { /* ignore */ }
            }
        }

        console.log(`Fetching stream URL for ${videoId}`);
        const output = await execYtDlpJson([
            `https://www.youtube.com/watch?v=${videoId}`,
            '--format', 'bestaudio[ext=webm]/bestaudio[acodec=opus]/bestaudio'
        ]);

        const targetPath = path.join(cacheDir, `${videoId}.webm`);
        if (!fs.existsSync(`${targetPath}.part`)) {
            downloadToCache(videoId, targetPath);
        }

        return {
            url: output.url,
            title: output.title,
            artist: output.uploader,
            thumbnail: output.thumbnail,
            duration: output.duration,
            format: 'stream'
        };
    } catch (error) {
        console.error('Get Stream URL Error:', error);
        return null;
    }
}

export function getCacheStats() {
    try {
        const cacheDir = getCacheDir();
        const files = fs.readdirSync(cacheDir);
        let totalSize = 0;
        let fileCount = 0;

        files.forEach(file => {
            if (file.endsWith('.webm') || file.endsWith('.opus') || file.endsWith('.mp3')) {
                const stats = fs.statSync(path.join(cacheDir, file));
                totalSize += stats.size;
                fileCount++;
            }
        });

        return {
            size: (totalSize / (1024 * 1024)).toFixed(2),
            count: fileCount,
            cacheDir: cacheDir,
            files: files.filter(f => f.endsWith('.webm') || f.endsWith('.opus') || f.endsWith('.mp3'))
        };
    } catch (error) {
        console.error("Failed to get cache stats:", error);
        return { size: '0.00', count: 0 };
    }
}

export function clearCache() {
    try {
        const cacheDir = getCacheDir();
        const files = fs.readdirSync(cacheDir);
        files.forEach(file => {
            if (file.endsWith('.webm') || file.endsWith('.opus') || file.endsWith('.mp3') || file.endsWith('.part')) {
                fs.unlinkSync(path.join(cacheDir, file));
            }
        });
        return true;
    } catch (error) {
        return false;
    }
}

export function deleteCacheFiles(fileIds: string[]) {
    try {
        const cacheDir = getCacheDir();
        const allFiles = fs.readdirSync(cacheDir);
        for (const id of fileIds) {
            const targetFile = allFiles.find(f => f.startsWith(id));
            if (targetFile) fs.unlinkSync(path.join(cacheDir, targetFile));
        }
        return true;
    } catch (error) {
        return false;
    }
}

export async function getVideoInfo(url: string) {
    try {
        const output = await execYtDlpJson([url, '--flat-playlist']);
        if (output) {
            const audioFormats = (output.formats || [])
                .filter((f: any) => f.vcodec === 'none' || f.acodec !== 'none')
                .map((f: any) => ({
                    formatId: f.format_id,
                    extension: f.ext,
                    codec: f.acodec,
                    abr: f.abr,
                    filesize: f.filesize || f.filesize_approx,
                    label: `${f.ext.toUpperCase()} - ${f.acodec || 'Unknown'} (${f.abr ? Math.round(f.abr) + 'kbps' : 'Unknown Quality'})`
                }))
                .sort((a: any, b: any) => (b.abr || 0) - (a.abr || 0));

            return {
                id: output.id,
                title: output.title,
                artist: output.uploader || 'Unknown Artist',
                duration: output.duration,
                thumbnail: output.thumbnail,
                source: 'youtube',
                formats: audioFormats
            };
        }
        return null;
    } catch (error) {
        return null;
    }
}

export async function cacheAudio(videoId: string, sender?: WebContents) {
    const cacheDir = getCacheDir();
    const filePath = path.join(cacheDir, `${videoId}.webm`);
    const tempPath = `${filePath}.part`;

    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > 10000) {
            sender?.send('cache:progress', { videoId, progress: 100, status: 'complete' });
            return { url: `atmusic://${filePath}`, format: 'local' };
        }
    }

    cancelCacheAudio();

    try {
        activeCacheVideoId = videoId;
        sender?.send('cache:progress', { videoId, progress: 0, status: 'downloading' });

        const info = await execYtDlpJson([
            `https://www.youtube.com/watch?v=${videoId}`,
            '--format', 'bestaudio[ext=webm]/bestaudio[acodec=opus]/bestaudio'
        ]);
        const expectedSize = info?.filesize || info?.filesize_approx || 0;

        const subprocess = execYtDlp([
            `https://www.youtube.com/watch?v=${videoId}`,
            '--no-warnings',
            '--output', filePath,
            '--format', 'bestaudio[ext=webm]/bestaudio[acodec=opus]/bestaudio'
        ]);

        activeCacheProcess = subprocess;

        const progressInterval = setInterval(() => {
            try {
                let currentSize = 0;
                if (fs.existsSync(tempPath)) currentSize = fs.statSync(tempPath).size;
                else if (fs.existsSync(filePath)) currentSize = fs.statSync(filePath).size;

                if (expectedSize > 0) {
                    const pct = Math.min(Math.round((currentSize / expectedSize) * 100), 99);
                    sender?.send('cache:progress', { videoId, progress: pct, status: 'downloading' });
                }
            } catch { /* ignore */ }
        }, 500);

        await new Promise((resolve, reject) => {
            subprocess.on('close', (code) => {
                clearInterval(progressInterval);
                code === 0 ? resolve(true) : reject(new Error(`Exit ${code}`));
            });
            subprocess.on('error', (err) => {
                clearInterval(progressInterval);
                reject(err);
            });
        });

        activeCacheProcess = null;
        if (activeCacheVideoId === videoId && fs.existsSync(filePath)) {
            sender?.send('cache:progress', { videoId, progress: 100, status: 'complete' });
            return { url: `atmusic://${filePath}`, format: 'local' };
        }
        return null;
    } catch (err: any) {
        activeCacheProcess = null;
        activeCacheVideoId = null;
        return getStreamUrl(videoId);
    }
}

export function cancelCacheAudio() {
    if (activeCacheProcess) {
        try { activeCacheProcess.kill('SIGTERM'); } catch { /* ignore */ }
        activeCacheProcess = null;
    }
    activeCacheVideoId = null;
}

