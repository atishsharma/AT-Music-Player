import { execYtDlp } from '../utils/ytdlp-bin';
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
    let artistStr = 'Unknown Artist';
    let albumStr = 'Unknown Album';

    // If customFilename is provided and DIFFERENT from original title, we try to parse it
    // If it's the SAME or not provided, we follow user request: 
    // "use video title as song name, unknown artist and unknown album"
    if (options.customFilename && options.customFilename !== track.title) {
        const parts = options.customFilename.split('-').map(s => s.trim());
        if (parts.length >= 3) {
            titleStr = parts[0] || track.title;
            albumStr = parts[1] || 'Unknown Album';
            artistStr = parts.slice(2).join(' - ') || 'Unknown Artist';
        } else if (parts.length === 2) {
            titleStr = parts[0] || track.title;
            artistStr = parts[1] || 'Unknown Artist';
            albumStr = 'Unknown Album';
        } else {
            titleStr = options.customFilename.trim() || track.title;
            artistStr = 'Unknown Artist';
            albumStr = 'Unknown Album';
        }
    } else {
        // Not edited: use video title as song name
        titleStr = track.title;
        artistStr = 'Unknown Artist';
        albumStr = 'Unknown Album';
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

    // yt-dlp `--parse-metadata FROM:TO`: FROM is a literal/template, TO assigns the field.
    // The old form (empty FROM matched against a literal regex) never matched, so custom
    // title/artist/album were silently dropped. Escape template `%` and the `:` separator.
    // A bare word would be read as a field name, so wrap it in a template default instead.
    const literal = (value: string) => /^[a-zA-Z_]+$/.test(value)
        ? `%(__none|${value})s`
        : value.replace(/%/g, '%%').replace(/:/g, '\\:');

    const args = [
        // Full URL: bare video IDs that start with '-' would be parsed as CLI flags
        `https://www.youtube.com/watch?v=${videoId}`,
        '--output', outputTemplate,
        '--format', formatFilter,
        '--no-playlist',
        '--newline',
        '--embed-metadata',
        '--parse-metadata', `${literal(titleStr)}:%(title)s`,
        '--parse-metadata', `${literal(artistStr)}:%(artist)s`,
        '--parse-metadata', `${literal(albumStr)}:%(album)s`,
        '--parse-metadata', `${literal(artistStr)}:%(uploader)s`,
    ];

    if (options.embedThumbnail !== false) {
        args.push('--embed-thumbnail');
    }

    if (options.format !== 'mp4') {
        args.push('--extract-audio');
        args.push('--audio-format');
        args.push(options.format === 'm4a' ? 'm4a' : 'mp3');
    }

    const subprocess = execYtDlp(args);

    activeDownloads.set(downloadId, subprocess);

    subprocess.stdout?.on('data', (data: Buffer) => {
        const str = data.toString();
        const match = str.match(/\[download\]\s+(\d+\.?\d*)%/);
        if (match) {
            const progress = parseFloat(match[1]);
            send({ id: downloadId, title: track.title, state: 'downloading', progress });
        }
    });

    const send = (payload: Record<string, unknown>) => {
        if (!mainWindow.isDestroyed()) mainWindow.webContents.send('download:update', payload);
    };

    // Spawn failures (e.g. yt-dlp missing) emit 'error' and would otherwise leave the
    // download stuck in "pending" forever.
    subprocess.on('error', (err) => {
        activeDownloads.delete(downloadId);
        db.prepare("UPDATE downloads SET state = 'failed', error = ? WHERE id = ?").run(String(err), downloadId);
        send({ id: downloadId, title: track.title, state: 'failed', error: String(err) });
    });

    subprocess.on('close', async (code: number | null) => {
        // Cancelled downloads were already removed from the map and marked 'cancelled'
        if (!activeDownloads.has(downloadId)) return;
        activeDownloads.delete(downloadId);
        if (code === 0) {
            db.prepare("UPDATE downloads SET state = 'completed', progress = 100 WHERE id = ?").run(downloadId);
            send({ id: downloadId, title: track.title, state: 'completed', progress: 100 });

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
            send({ id: downloadId, title: track.title, state: 'failed', error: 'Download failed' });
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
