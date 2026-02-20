import YoutubeDl from 'yt-dlp-exec';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';




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
        const output = await YoutubeDl(`ytsearch${limit}:${musicQuery}`, {
            dumpSingleJson: true,
            noWarnings: true,
            flatPlaylist: true,
            format: 'bestaudio'
        });

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
        const output = await YoutubeDl(`https://music.youtube.com/search?q=${encodeURIComponent(query)}`, {
            dumpSingleJson: true,
            noWarnings: true,
            flatPlaylist: true
        });

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

        const fallback = await YoutubeDl(`ytsearch${limit}:${query} official audio`, {
            dumpSingleJson: true,
            noWarnings: true,
            flatPlaylist: true
        });

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
        const yt = YoutubeDl.create({
            workdir: path.dirname(targetPath),
        });

        // Download to .part file
        // Note: yt-dlp-exec might not support 'output' flag perfectly with 'create' factory if arguments are strict
        // But normally it passes args.
        await yt(`https://www.youtube.com/watch?v=${videoId}`, {
            noWarnings: true,
            output: path.basename(tempPath),
            // opus/webm are royalty-free and work in stock Electron without proprietary codecs
            format: 'bestaudio[ext=webm]/bestaudio[acodec=opus]/bestaudio',
        });

        // Rename if successful
        if (fs.existsSync(tempPath)) {
            // Check size?
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
        // Clean up partial file
        if (fs.existsSync(tempPath)) {
            try {
                fs.unlinkSync(tempPath);
            } catch (e) {
                // Ignore
            }
        }
    }
}

export async function getStreamUrl(videoId: string) {
    try {
        const cacheDir = getCacheDir();
        // Check for webm or opus (Electron-compatible formats — no proprietary codecs needed)
        const webmPath = path.join(cacheDir, `${videoId}.webm`);
        const opusPath = path.join(cacheDir, `${videoId}.opus`);
        const mp3Path = path.join(cacheDir, `${videoId}.mp3`);

        let localPath = null;
        if (fs.existsSync(webmPath)) localPath = webmPath;
        else if (fs.existsSync(opusPath)) localPath = opusPath;
        else if (fs.existsSync(mp3Path)) localPath = mp3Path;

        if (localPath) {
            const stats = fs.statSync(localPath);
            // Ensure reasonable size (10KB+)
            if (stats.size > 10000) {
                console.log(`Serving from cache: ${localPath}`);
                return {
                    url: `atmusic://${localPath}`, // Use custom protocol
                    format: 'local'
                };
            } else {
                console.warn(`Cached file too small/corrupt, deleting: ${localPath}`);
                try { fs.unlinkSync(localPath); } catch (e) { }
            }
        }

        console.log(`Fetching stream URL for ${videoId}`);
        // If not cached, get stream URL AND start background download
        const output = await YoutubeDl(`https://www.youtube.com/watch?v=${videoId}`, {
            dumpSingleJson: true,
            noWarnings: true,
            // Prefer opus/webm — royalty-free, supported by stock Electron
            // NEVER use m4a/aac — crashes Electron media pipeline without proprietary codecs
            format: 'bestaudio[ext=webm]/bestaudio[acodec=opus]/bestaudio'
        });

        // Background download — save as .webm
        const targetPath = path.join(cacheDir, `${videoId}.webm`);

        // Check if download is already in progress (.part exists) to avoid duplicates
        // Note: fs.exists is async promisified, using sync here for simplicity or await promisified
        // I'll use sync as I didn't await localPath check either (it was sync)
        if (!fs.existsSync(`${targetPath}.part`)) {
            // Don't await this! We want immediate playback
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
// Cache Management
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
            size: (totalSize / (1024 * 1024)).toFixed(2), // MB
            count: fileCount
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
        console.error("Failed to clear cache:", error);
        return false;
    }
}

export async function getVideoInfo(url: string) {
    try {
        const output = await YoutubeDl(url, {
            dumpSingleJson: true,
            noWarnings: true,
            flatPlaylist: true
        });

        if (output) {
            // Filter and map audio formats
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
                artist: output.uploader || output.artist || 'Unknown Artist',
                duration: output.duration,
                thumbnail: output.thumbnail,
                source: 'youtube',
                formats: audioFormats
            };
        }
        return null;
    } catch (error) {
        console.error('Fetch Video Info Error:', error);
        return null;
    }
}

export async function cacheAudio(videoId: string) {
    const cacheDir = getCacheDir();
    const filePath = path.join(cacheDir, `${videoId}.webm`);

    // Check if already in cache and valid
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > 10000) {
            return { url: `atmusic://${filePath}`, format: 'local' };
        }
    }

    try {
        console.log(`Explicitly caching audio for ${videoId}`);
        await YoutubeDl(`https://www.youtube.com/watch?v=${videoId}`, {
            noWarnings: true,
            output: filePath,
            format: 'bestaudio[ext=webm]/bestaudio[acodec=opus]/bestaudio',
        });

        if (fs.existsSync(filePath)) {
            return { url: `atmusic://${filePath}`, format: 'local' };
        }
        throw new Error('File not created after download');
    } catch (err) {
        console.error(`Cache audio failed for ${videoId}:`, err);
        // Fallback to stream if caching fails
        return getStreamUrl(videoId);
    }
}
