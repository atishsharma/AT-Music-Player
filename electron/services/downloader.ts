import YoutubeDl from 'yt-dlp-exec';
import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { getDB } from '../db';


// Store active downloads
const activeDownloads = new Map<string, any>();

export async function startDownload(track: any, options: { format: string, quality: string, formatId?: string, customFilename?: string, embedThumbnail?: boolean }, mainWindow: BrowserWindow) {
    const db = getDB();
    const videoId = track.id;
    const downloadId = videoId;

    // Check if already downloading or downloaded
    const existing = db.prepare('SELECT state FROM downloads WHERE id = ?').get(downloadId) as any;
    if (existing && existing.state === 'completed') {
        return { success: false, message: 'Already downloaded' };
    }
    if (activeDownloads.has(downloadId)) {
        return { success: false, message: 'Already downloading' };
    }

    // Get download path from settings
    const dlPathSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('download_path') as { value: string } | undefined;
    let downloadsDir = dlPathSetting?.value;

    if (!downloadsDir) {
        const userDataPath = app.getPath('userData');
        downloadsDir = path.join(userDataPath, 'downloads');
    }

    if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir, { recursive: true });
    }

    // Insert entry into DB
    db.prepare(`
        INSERT OR REPLACE INTO downloads (id, title, state, progress, created_at)
        VALUES (?, ?, 'pending', 0, CURRENT_TIMESTAMP)
    `).run(downloadId, track.title);

    // Notify UI
    mainWindow.webContents.send('download:update', { id: downloadId, title: track.title, state: 'pending', progress: 0 });

    let titleStr = track.title;
    let artistStr = track.artist || 'Unknown Artist';
    let albumStr = '';

    if (options.customFilename) {
        const parts = options.customFilename.split('-').map(s => s.trim());
        if (parts.length >= 3) {
            titleStr = parts[0] || titleStr;
            albumStr = parts[1];
            artistStr = parts.slice(2).join(' - ') || artistStr;
        } else if (parts.length === 2) {
            titleStr = parts[0] || titleStr;
            artistStr = parts[1] || artistStr;
        } else {
            titleStr = options.customFilename.trim() || titleStr;
        }
    }

    // Build output template using the parsed title instead of full customFilename
    // As per user request: "don't use that [artist] in song title add artist name to file metadata"
    const safeTitle = titleStr.replace(/[<>:"/\\|?*]/g, '_');
    const outputTemplate = path.join(downloadsDir, `${safeTitle}.%(ext)s`);

    // Build format string based on options
    let formatFilter = options.formatId || 'bestaudio/best';
    if (!options.formatId) {
        if (options.format === 'mp3') {
            formatFilter = 'bestaudio[ext=mp3]/bestaudio/best';
        } else if (options.format === 'm4a') {
            formatFilter = 'bestaudio[ext=m4a]/bestaudio/best';
        } else if (options.format === 'mp4') {
            formatFilter = 'bestvideo+bestaudio/best';
        }
    }

    const subprocess = YoutubeDl.exec(videoId, {
        output: outputTemplate,
        format: formatFilter,
        noPlaylist: true,
        // Embed metadata and thumbnail
        embedMetadata: true,
        embedThumbnail: options.embedThumbnail !== false,
        parseMetadata: [
            `${titleStr.replace(/%/g, '%%')}:%(title)s`,
            `${artistStr.replace(/%/g, '%%')}:%(artist)s`,
            ...(albumStr ? [`${albumStr.replace(/%/g, '%%')}:%(album)s`] : [])
        ],
        // Add extract audio if not mp4
        ...(options.format !== 'mp4' ? { extractAudio: true, audioFormat: options.format === 'm4a' ? 'm4a' : 'mp3' } : {})
    });

    activeDownloads.set(downloadId, subprocess);

    subprocess.stdout?.on('data', (data: Buffer) => {
        const str = data.toString();
        const match = str.match(/\[download\]\s+(\d+\.?\d*)%/);
        if (match) {
            const progress = parseFloat(match[1]);
            mainWindow.webContents.send('download:update', { id: downloadId, title: track.title, state: 'downloading', progress });
        }
    });

    subprocess.on('close', async (code: number) => {
        activeDownloads.delete(downloadId);
        if (code === 0) {
            db.prepare("UPDATE downloads SET state = 'completed', progress = 100 WHERE id = ?").run(downloadId);
            mainWindow.webContents.send('download:update', { id: downloadId, title: track.title, state: 'completed', progress: 100 });

            // Add to library
            // Since we don't know the exact filename easily without parsing JSON first, 
            // for now let's use the track info we have plus the videoId as a reference.
            // A better way is to run a scan on the downloads folder or use the --print filename flag.

            // For now, let's just insert a track entry pointing to the ytdlp cache logic or the actual file if we can find it.
            // Actually, we should probably find the file.

            // This is naive, but let's try to match by title or wait for a second to find newest file?
            // Better: use ytdlp to get the filename before downloading.

            // To be safe and simple for the user, let's just trigger a library scan of the downloads folder.
            const { scanDirectory } = await import('./scanner.js');
            await scanDirectory(downloadsDir!, mainWindow);

        } else {
            db.prepare("UPDATE downloads SET state = 'failed', error = ? WHERE id = ?").run(`Exit code ${code}`, downloadId);
            mainWindow.webContents.send('download:update', { id: downloadId, title: track.title, state: 'failed', error: 'Download failed' });
        }
    });

    return { success: true };
}

export function cancelDownload(videoId: string) {
    const subprocess = activeDownloads.get(videoId);
    if (subprocess) {
        subprocess.kill();
        activeDownloads.delete(videoId);
        const db = getDB();
        db.prepare("UPDATE downloads SET state = 'cancelled' WHERE id = ?").run(videoId);
        return true;
    }
    return false;
}
