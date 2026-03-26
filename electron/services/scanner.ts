import fs from 'fs';
import path from 'path';
import { getDB } from '../db';
import { BrowserWindow, app } from 'electron';
import crypto from 'crypto';

const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.flac', '.wav', '.ogg'];

export async function scanDirectory(dirPath: string, window?: BrowserWindow) {
    const { parseFile } = await import('music-metadata');
    const db = getDB();
    const files: string[] = [];

    // Ensure images directory exists
    const userDataPath = app.getPath('userData');
    const imagesDir = path.join(userDataPath, 'images');
    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }

    function walk(currentPath: string) {
        if (!fs.existsSync(currentPath)) return;
        const stats = fs.statSync(currentPath);
        if (stats.isDirectory()) {
            try {
                const entries = fs.readdirSync(currentPath);
                for (const entry of entries) {
                    walk(path.join(currentPath, entry));
                }
            } catch (e) {
                console.error(`Error reading directory ${currentPath}:`, e);
            }
        } else if (stats.isFile()) {
            const ext = path.extname(currentPath).toLowerCase();
            if (AUDIO_EXTENSIONS.includes(ext)) {
                files.push(currentPath);
            }
        }
    }

    console.log(`[Scanner] Scanning directory: ${dirPath}`);
    // Save the folder path to the database
    db.prepare('INSERT OR IGNORE INTO folders (path) VALUES (?)').run(dirPath);

    walk(dirPath);
    console.log(`[Scanner] Found ${files.length} audio files.`);

    let processed = 0;
    const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO tracks (title, artist, album, duration, path, format, image_path, source)
    VALUES (@title, @artist, @album, @duration, @path, @format, @image_path, 'local')
  `);

    for (const filePath of files) {
        try {
            console.log(`[Scanner] Processing: ${path.basename(filePath)}`);
            const metadata = await parseFile(filePath);
            const title = metadata.common.title || path.basename(filePath, path.extname(filePath));
            const artist = metadata.common.artist || 'Unknown Artist';
            const album = metadata.common.album || 'Unknown Album';
            const duration = metadata.format.duration || 0;
            const format = metadata.format.container || path.extname(filePath).substring(1);

            let image_path = null;
            if (metadata.common.picture && metadata.common.picture.length > 0) {
                const picture = metadata.common.picture[0];
                const hash = crypto.createHash('md5').update(picture.data).digest('hex');
                const ext = picture.format === 'image/jpeg' ? '.jpg' : picture.format === 'image/png' ? '.png' : '.jpg';
                const fileName = `${hash}${ext}`;
                const destPath = path.join(imagesDir, fileName);

                if (!fs.existsSync(destPath)) {
                    fs.writeFileSync(destPath, picture.data);
                }
                image_path = destPath;
            }

            const info = {
                title,
                artist,
                album,
                duration,
                path: filePath,
                format,
                image_path
            };

            insertStmt.run(info);
            processed++;

            if (window && processed % 5 === 0) {
                window.webContents.send('scan-progress', { total: files.length, processed });
            }
        } catch (err) {
            console.error(`[Scanner] Error parsing file ${filePath}:`, err);
        }
    }

    console.log(`[Scanner] Scan complete. Processed ${processed} files.`);
    if (window) {
        window.webContents.send('scan-complete', { total: files.length, processed });
    }
}
