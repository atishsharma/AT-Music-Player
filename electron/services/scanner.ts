import fs from 'fs';
import path from 'path';
import { getDB } from '../db';
import { BrowserWindow, app } from 'electron';
import crypto from 'crypto';

const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.flac', '.wav', '.ogg', '.opus', '.aac'];

// Async, non-blocking directory walk (the old sync walk froze the main process on big libraries)
async function walk(dirPath: string, files: { path: string; mtime: number }[]) {
    let entries: fs.Dirent[];
    try {
        entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    } catch (e) {
        console.error(`Error reading directory ${dirPath}:`, e);
        return;
    }

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            await walk(fullPath, files);
        } else if (entry.isFile() && AUDIO_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
            try {
                const stats = await fs.promises.stat(fullPath);
                files.push({ path: fullPath, mtime: stats.mtimeMs });
            } catch { /* file vanished mid-scan */ }
        }
    }
}

export async function scanDirectory(dirPath: string, window?: BrowserWindow) {
    const { parseFile } = await import('music-metadata');
    const db = getDB();

    // Ensure images directory exists
    const imagesDir = path.join(app.getPath('userData'), 'images');
    await fs.promises.mkdir(imagesDir, { recursive: true });

    console.log(`[Scanner] Scanning directory: ${dirPath}`);
    db.prepare('INSERT OR IGNORE INTO folders (path) VALUES (?)').run(dirPath);

    const found: { path: string; mtime: number }[] = [];
    await walk(dirPath, found);

    // Skip files that are already indexed and unchanged since the last scan
    const known = new Map<string, number | null>();
    for (const row of db.prepare('SELECT path, mtime FROM tracks').all() as { path: string; mtime: number | null }[]) {
        known.set(row.path, row.mtime);
    }
    const files = found.filter(f => known.get(f.path) !== f.mtime);
    console.log(`[Scanner] Found ${found.length} audio files, ${files.length} new or changed.`);

    // UPSERT keeps the existing row id. The previous INSERT OR REPLACE deleted and re-inserted
    // the row on every rescan, giving tracks new ids and breaking playlists/history references.
    const upsert = db.prepare(`
        INSERT INTO tracks (title, artist, album, duration, path, format, image_path, source, mtime)
        VALUES (@title, @artist, @album, @duration, @path, @format, @image_path, 'local', @mtime)
        ON CONFLICT(path) DO UPDATE SET
            title = excluded.title, artist = excluded.artist, album = excluded.album,
            duration = excluded.duration, format = excluded.format,
            image_path = excluded.image_path, mtime = excluded.mtime
    `);

    let processed = 0;
    let lastProgress = 0;

    for (const file of files) {
        try {
            const metadata = await parseFile(file.path);
            const ext = path.extname(file.path);

            let image_path: string | null = null;
            const picture = metadata.common.picture?.[0];
            if (picture) {
                const hash = crypto.createHash('md5').update(picture.data).digest('hex');
                const imgExt = picture.format === 'image/png' ? '.png' : '.jpg';
                const destPath = path.join(imagesDir, `${hash}${imgExt}`);
                if (!fs.existsSync(destPath)) {
                    await fs.promises.writeFile(destPath, picture.data);
                }
                image_path = destPath;
            }

            upsert.run({
                title: metadata.common.title || path.basename(file.path, ext),
                artist: metadata.common.artist || 'Unknown Artist',
                album: metadata.common.album || 'Unknown Album',
                duration: metadata.format.duration || 0,
                path: file.path,
                format: metadata.format.container || ext.substring(1),
                image_path,
                mtime: file.mtime
            });
            processed++;
        } catch (err) {
            console.error(`[Scanner] Error parsing file ${file.path}:`, err);
        }

        // Throttle progress IPC to ~10/s
        const now = Date.now();
        if (window && !window.isDestroyed() && now - lastProgress > 100) {
            lastProgress = now;
            window.webContents.send('scan-progress', { total: files.length, processed });
        }
    }

    console.log(`[Scanner] Scan complete. Processed ${processed} files.`);
    if (window && !window.isDestroyed()) {
        window.webContents.send('scan-complete', { total: files.length, processed });
    }
}
