import { ipcMain, dialog, BrowserWindow, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { getDB } from '../db';
import { scanDirectory } from '../services/scanner';
import { searchYouTube, searchYTMusic, getStreamUrl, getCacheStats, clearCache, getVideoInfo, getRadioMix, getSubtitleTracks, getSubtitleVtt } from '../services/ytdlp';
import { startDownload, cancelDownload } from '../services/downloader';
import { getLyrics, fetchLRCLIB } from '../services/lyrics';
import { searchArtists, getArtistById, getAlbumById, getCoverArt } from '../services/musicbrainz';
import { getArtistInfo, getAlbumInfo } from '../services/lastfm';
import { downloadAsset } from '../services/assets';
import axios from 'axios';
import { execFile } from 'child_process';
import { ytDlpBinaryPath, checkSystemYtDlp, execYtDlpJson } from '../utils/ytdlp-bin';
import util from 'util';
import { registerStatsHandlers } from './stats';
import { registerSmartHandlers } from './smart';
import { registerSocialHandlers } from './social';
const execFilePromise = util.promisify(execFile);

// Extension from the URL path only (query strings like ?v=1 must not leak into filenames)
function imageExt(url: string): string {
    try {
        return path.extname(new URL(url).pathname) || '.png';
    } catch {
        return '.png';
    }
}

const HTML_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function decodeHtml(text: string): string {
    return String(text || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
        if (e[0] === '#') {
            const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
            return Number.isFinite(code) ? String.fromCodePoint(code) : m;
        }
        return HTML_ENTITIES[e.toLowerCase()] ?? m;
    });
}

// Last.fm serves this grey star for every artist without a photo
const isLastfmPlaceholder = (url: string) => url.includes('2a96cbd8b46e442fc41c2b86b821562f');

function parseYear(date?: string): number | null {
    if (!date) return null;
    const year = new Date(date).getFullYear();
    return Number.isNaN(year) ? null : year;
}

// The window IPC events are routed to. Kept at module level so that re-creating the
// window (macOS `activate`) doesn't re-register handlers, which would throw.
let mainWindow: BrowserWindow;
let handlersRegistered = false;

// Register all IPC handlers
export function registerHandlers(win: BrowserWindow) {
    mainWindow = win;
    if (handlersRegistered) return;
    handlersRegistered = true;
    registerStatsHandlers();
    registerSmartHandlers();
    registerSocialHandlers();

    // Dialogs
    ipcMain.handle('dialog:openDirectory', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory']
        });
        if (canceled) {
            return null;
        } else {
            return filePaths[0];
        }
    });

    ipcMain.handle('dialog:openImage', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }]
        });
        if (canceled) {
            return null;
        } else {
            return filePaths[0];
        }
    });

    ipcMain.handle('shell:showItemInFolder', (_event, fullPath) => {
        shell.showItemInFolder(fullPath);
    });

    ipcMain.handle('shell:trashItem', async (_event, fullPath) => {
        try {
            await shell.trashItem(fullPath);
            // Also remove from DB to sync UI
            const db = getDB();
            db.prepare('DELETE FROM tracks WHERE path = ?').run(fullPath);

            // Notify UI that a file was deleted and library might need refresh
            mainWindow.webContents.send('scan-complete');
            return true;
        } catch (error) {
            console.error('Failed to trash item:', error);
            return false;
        }
    });

    // Library Operations
    ipcMain.handle('library:scan', async (_event, dirPath) => {
        if (!dirPath) return false;
        // Run scan in background (though here it's awaited, better if async)
        await scanDirectory(dirPath, mainWindow);
        return true;
    });

    ipcMain.handle('library:getTracks', () => {
        const db = getDB();
        // Return all tracks sorted by added date desc, along with has_lyrics flag from cache
        return db.prepare(`
            SELECT t.*, CASE WHEN lc.id IS NOT NULL THEN 1 ELSE 0 END as hasLyrics
            FROM tracks t
            LEFT JOIN lyrics_cache lc ON t.title = lc.title AND t.artist = lc.artist
            ORDER BY t.created_at DESC
        `).all();
    });

    ipcMain.handle('library:getRecent', (_event, limit = 50) => {
        const db = getDB();
        return db.prepare('SELECT * FROM tracks ORDER BY created_at DESC LIMIT ?').all(limit);
    });

    ipcMain.handle('library:search', (_event, query) => {
        const db = getDB();
        const term = `%${query}%`;
        const sql = `
      SELECT * FROM tracks 
      WHERE title LIKE ? OR artist LIKE ? OR album LIKE ? 
      LIMIT 100
    `;
        return db.prepare(sql).all(term, term, term);
    });

    ipcMain.handle('library:getFolders', () => {
        const db = getDB();
        return db.prepare('SELECT * FROM folders ORDER BY added_at DESC').all();
    });

    ipcMain.handle('library:removeFolder', (_event, pathToRemove) => {
        const db = getDB();
        // Remove folder and its tracks
        db.prepare('DELETE FROM folders WHERE path = ?').run(pathToRemove);
        // Match only files inside the folder (not sibling folders sharing a prefix, e.g. /Music2)
        // and escape LIKE wildcards that may appear in real paths.
        const base = String(pathToRemove).replace(/[\\/]+$/, '');
        const escaped = base.replace(/[\\%_]/g, (c) => '\\' + c);
        db.prepare("DELETE FROM tracks WHERE source = 'local' AND (path LIKE ? ESCAPE '\\' OR path LIKE ? ESCAPE '\\')")
            .run(`${escaped}/%`, `${escaped}\\\\%`);
        return true;
    });

    ipcMain.handle('library:getAlbumTracks', (_event, albumName) => {
        const db = getDB();
        return db.prepare(`
            SELECT t.*, CASE WHEN lc.id IS NOT NULL THEN 1 ELSE 0 END as hasLyrics
            FROM tracks t
            LEFT JOIN lyrics_cache lc ON t.title = lc.title AND t.artist = lc.artist
            WHERE t.album = ? 
            ORDER BY t.id ASC
        `).all(albumName);
    });

    ipcMain.handle('library:getArtistTracks', (_event, artistName) => {
        const db = getDB();
        return db.prepare(`
            SELECT t.*, CASE WHEN lc.id IS NOT NULL THEN 1 ELSE 0 END as hasLyrics
            FROM tracks t
            LEFT JOIN lyrics_cache lc ON t.title = lc.title AND t.artist = lc.artist
            WHERE t.artist = ? 
            ORDER BY t.album ASC, t.id ASC
        `).all(artistName);
    });

    // YouTube Operations
    ipcMain.handle('youtube:search', async (_event, query) => {
        return await searchYouTube(query);
    });

    // Search for a video ID using yt-dlp search — uses the query AS-IS (no 'music' appended)
    ipcMain.handle('youtube:getVideoId', async (_event, query) => {
        try {
            // Search YouTube directly without appending 'music' so video searches work properly
            const output = await execYtDlpJson([
                `ytsearch1:${query}`,
                '--flat-playlist',
            ]);

            // Handle both single result and playlist format
            if (output) {
                if (output.entries && output.entries.length > 0) {
                    return output.entries[0].id || null;
                }
                // Single result (not wrapped in entries)
                if (output.id) {
                    return output.id;
                }
            }
            return null;
        } catch (error) {
            console.error("Failed to get video ID:", error);
            return null;
        }
    });

    // Smart Radio: similar songs for a seed. Local tracks without a video id are matched
    // to YouTube first (and the id is remembered on the track).
    ipcMain.handle('radio:getMix', async (_event, seed: { videoId?: string; title?: string; artist?: string; trackId?: number }) => {
        let videoId = seed.videoId;
        if (!videoId && seed.title) {
            try {
                const output = await execYtDlpJson([`ytsearch1:${seed.title} ${seed.artist ?? ''} audio`, '--flat-playlist']);
                videoId = output?.entries?.[0]?.id || output?.id;
                if (videoId && typeof seed.trackId === 'number') {
                    getDB().prepare('UPDATE tracks SET video_id = ? WHERE id = ?').run(videoId, seed.trackId);
                }
            } catch (err) {
                console.error('Radio seed lookup failed:', err);
            }
        }
        return videoId ? getRadioMix(videoId) : [];
    });

    ipcMain.handle('youtube:stream', async (_event, videoId) => {
        return await getStreamUrl(videoId);
    });

    ipcMain.handle('ytdlp:check', async () => {
        return checkSystemYtDlp();
    });

    ipcMain.handle('yt:getVideoStream', async (_event, videoId) => {
        try {
            const { isFFmpegAvailable, startVideoProxyServer, configureStream } = await import('../services/videoProxy');

            if (isFFmpegAvailable()) {
                // Get separate best video + best audio stream URLs
                const { stdout } = await execFilePromise(ytDlpBinaryPath, [
                    '-f', 'bestvideo+bestaudio/best',
                    '--no-playlist',
                    '--get-url',
                    '--no-warnings',
                    `https://www.youtube.com/watch?v=${videoId}`
                ]);

                const urls = stdout.trim().split('\n').filter(Boolean);

                if (urls.length >= 2) {
                    // Two URLs = separate video + audio → merge via ffmpeg proxy
                    const port = await startVideoProxyServer();
                    configureStream(urls[0], urls[1]);
                    return `http://127.0.0.1:${port}/stream`;
                }
                // Single URL = pre-merged format
                return urls[0];
            }

            // Fallback: no ffmpeg, use pre-merged format
            const { stdout } = await execFilePromise(ytDlpBinaryPath, [
                '-f', 'best[vcodec!=none][acodec!=none]/best',
                '--no-playlist',
                '--get-url',
                '--no-warnings',
                `https://www.youtube.com/watch?v=${videoId}`
            ]);
            return stdout.trim().split('\n')[0];
        } catch (error) {
            console.error('Failed to get video stream:', error);
            throw error;
        }
    });

    ipcMain.handle('yt:getVideoStreamWithQuality', async (_event, { videoId, quality }) => {
        try {
            let heightLimit = '1080';
            if (quality === '720p') heightLimit = '720';
            if (quality === '480p') heightLimit = '480';
            if (quality === '360p') heightLimit = '360';

            // Step 1: Try to find a pre-merged format (has both video + audio in one file)
            // This avoids ffmpeg entirely and is the fastest path
            try {
                const preMergedFormat = `best[height<=${heightLimit}][vcodec!=none][acodec!=none]/best[ext=mp4][height<=${heightLimit}][vcodec!=none][acodec!=none]`;
                const { stdout: preMergedOut } = await execFilePromise(ytDlpBinaryPath, [
                    '-f', preMergedFormat,
                    '--no-playlist',
                    '--get-url',
                    '--no-warnings',
                    `https://www.youtube.com/watch?v=${videoId}`
                ]);

                const urls = preMergedOut.trim().split('\n').filter(Boolean);
                if (urls.length === 1) {
                    console.log(`[VideoStream] Serving ${quality} directly (pre-merged format)`);
                    // Stop any running ffmpeg proxy since we don't need it
                    try {
                        const { stopStream } = await import('../services/videoProxy');
                        stopStream();
                    } catch { /* ignore */ }
                    return urls[0];
                }
            } catch {
                // No pre-merged format found at this resolution, fall through to ffmpeg
            }

            // Step 2: No pre-merged format available — use ffmpeg to merge separate streams
            const { isFFmpegAvailable, startVideoProxyServer, configureStream } = await import('../services/videoProxy');

            if (isFFmpegAvailable()) {
                const formatString = `bestvideo[height<=${heightLimit}]+bestaudio/best[height<=${heightLimit}]/best`;

                const { stdout } = await execFilePromise(ytDlpBinaryPath, [
                    '-f', formatString,
                    '--no-playlist',
                    '--get-url',
                    '--no-warnings',
                    `https://www.youtube.com/watch?v=${videoId}`
                ]);

                const urls = stdout.trim().split('\n').filter(Boolean);

                if (urls.length >= 2) {
                    const port = await startVideoProxyServer();
                    configureStream(urls[0], urls[1]);
                    console.log(`[VideoStream] Serving ${quality} via ffmpeg proxy (port ${port})`);
                    return `http://127.0.0.1:${port}/stream`;
                }
                return urls[0];
            }

            // Step 3: No ffmpeg — last resort, get whatever best format is available
            const { stdout } = await execFilePromise(ytDlpBinaryPath, [
                '-f', `best[height<=${heightLimit}]/best`,
                '--no-playlist',
                '--get-url',
                '--no-warnings',
                `https://www.youtube.com/watch?v=${videoId}`
            ]);
            return stdout.trim().split('\n')[0];
        } catch (error) {
            console.error('Failed to get video stream with quality:', error);
            throw error;
        }
    });

    ipcMain.handle('yt:listSubtitles', (_event, videoId: string) => getSubtitleTracks(videoId));
    ipcMain.handle('yt:getSubtitle', (_event, { videoId, lang, auto }: { videoId: string; lang: string; auto: boolean }) => getSubtitleVtt(videoId, lang, auto));

    // Stop any active ffmpeg video proxy stream
    ipcMain.handle('yt:stopVideoStream', async () => {
        try {
            const { stopStream } = await import('../services/videoProxy');
            stopStream();
        } catch { /* ignore */ }
    });

    // New Multi-Provider Search
    ipcMain.handle('search:library', (_event, query) => {
        const db = getDB();
        const term = `%${query}%`;
        return db.prepare(`
            SELECT t.*, CASE WHEN lc.id IS NOT NULL THEN 1 ELSE 0 END as hasLyrics
            FROM tracks t
            LEFT JOIN lyrics_cache lc ON t.title = lc.title AND t.artist = lc.artist
            WHERE t.title LIKE ? OR t.artist LIKE ? OR t.album LIKE ? 
            LIMIT 100
        `).all(term, term, term);
    });

    ipcMain.handle('search:youtube', async (_event, query, options) => {
        const limit = options?.limit || 20;
        return await searchYouTube(query, limit);
    });



    ipcMain.handle('search:ytmusic', async (_event, query, options) => {
        const limit = options?.limit || 20;
        return await searchYTMusic(query, limit);
    });

    ipcMain.handle('cache:getStats', () => {
        const stats = getCacheStats();
        const db = getDB();

        if (stats.files && stats.files.length > 0) {
            const enrichedFiles = stats.files.map(fileName => {
                const videoId = fileName.replace('.webm', '').replace('.opus', '').replace('.mp3', '');

                // Try to find in history or tracks
                const metadata = db.prepare(`
                    SELECT title, artist, image_path as thumbnail, duration, source, video_id
                    FROM history 
                    WHERE video_id = ? 
                    UNION
                    SELECT title, artist, image_path as thumbnail, duration, source, video_id
                    FROM tracks
                    WHERE video_id = ?
                    LIMIT 1
                `).get(videoId, videoId) as { title?: string; artist?: string; thumbnail?: string; duration?: number; source?: string } | undefined;

                return {
                    id: videoId,
                    video_id: videoId,
                    title: metadata?.title || videoId,
                    artist: metadata?.artist || 'Unknown Artist',
                    thumbnail: metadata?.thumbnail || '',
                    duration: metadata?.duration || 0,
                    source: metadata?.source || 'youtube',
                    path: `atmusic://${stats.cacheDir}/${fileName}`
                };
            });
            return { ...stats, files: enrichedFiles };
        }

        return stats;
    });

    ipcMain.handle('cache:clear', () => {
        return clearCache();
    });

    ipcMain.handle('cache:delete', async (_event, fileIds: string[]) => {
        const { deleteCacheFiles } = await import('../services/ytdlp.js');
        return deleteCacheFiles(fileIds);
    });

    ipcMain.handle('cache:moveToLibrary', async (_event, track: { id: string; title: string; artist: string; duration: number; thumbnail: string; video_id: string }) => {
        try {
            const db = getDB();
            const stats = getCacheStats();
            const cacheDir: string = stats.cacheDir || '';

            // Find the cached file for this video ID

            const extensions = ['.webm', '.opus', '.mp3'];
            let sourcePath: string | null = null;
            let ext = '';
            for (const e of extensions) {
                const candidate = path.join(cacheDir, `${track.id}${e}`);
                if (fs.existsSync(candidate)) {
                    sourcePath = candidate;
                    ext = e;
                    break;
                }
            }

            if (!sourcePath) {
                return { success: false, error: 'Cached file not found' };
            }

            // Check if song already exists in library by video_id
            const videoId = track.video_id || track.id;
            const alreadyInLibrary = db.prepare(
                "SELECT id FROM tracks WHERE video_id = ? AND source = 'local'"
            ).get(videoId) as { id: number } | undefined;
            if (alreadyInLibrary) {
                return { success: false, error: 'already_exists' };
            }

            // Get download path from settings
            const dlPathSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('download_path') as { value: string } | undefined;
            let downloadsDir = dlPathSetting?.value;
            if (!downloadsDir) {
                const { app: electronApp } = await import('electron');
                downloadsDir = path.join(electronApp.getPath('userData'), 'downloads');
            }
            if (!fs.existsSync(downloadsDir)) {
                fs.mkdirSync(downloadsDir, { recursive: true });
            }

            // Build safe filename
            const safeTitle = (track.title || track.id).replace(/[<>:"/\\|?*]/g, '_');
            // Never overwrite another song that happens to share the title
            let destPath = path.join(downloadsDir, `${safeTitle}${ext}`);
            for (let n = 2; fs.existsSync(destPath); n++) destPath = path.join(downloadsDir, `${safeTitle} (${n})${ext}`);

            // Move file from cache to downloads (copy then delete)
            fs.copyFileSync(sourcePath, destPath);
            fs.unlinkSync(sourcePath);

            // Insert into tracks database
            const existing = db.prepare('SELECT id FROM tracks WHERE path = ?').get(destPath) as { id: number } | undefined;
            if (!existing) {
                db.prepare(`
                    INSERT INTO tracks (title, artist, album, duration, path, image_path, source, video_id, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'local', ?, CURRENT_TIMESTAMP)
                `).run(
                    track.title || 'Unknown',
                    track.artist || 'Unknown Artist',
                    'Unknown Album',
                    track.duration || 0,
                    destPath,
                    track.thumbnail || '',
                    track.video_id || track.id
                );
            }

            // Notify UI to refresh library and cache stats
            mainWindow.webContents.send('scan-complete');
            mainWindow.webContents.send('cache:stats-changed');

            return { success: true, title: track.title };
        } catch (err) {
            console.error('Failed to move cache to library:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    });

    ipcMain.handle('youtube:getInfo', async (_event, url) => {
        return await getVideoInfo(url);
    });


    ipcMain.handle('library:getArtist', (_event, name) => {
        const db = getDB();
        return db.prepare('SELECT * FROM artists WHERE name = ?').get(name);
    });

    ipcMain.handle('library:updateTrackMetadata', (_event, { id, title, artist, album, image_path }) => {
        const db = getDB();
        const updates: string[] = [];
        const values: (string | number)[] = [];

        if (title !== undefined) { updates.push('title = ?'); values.push(title); }
        if (artist !== undefined) { updates.push('artist = ?'); values.push(artist); }
        if (album !== undefined) { updates.push('album = ?'); values.push(album); }
        if (image_path !== undefined) { updates.push('image_path = ?'); values.push(image_path); }

        if (updates.length === 0) return true;

        const sql = `UPDATE tracks SET ${updates.join(', ')} WHERE id = ?`;
        values.push(id);

        return db.prepare(sql).run(...values);
    });

    ipcMain.handle('library:updateVideoId', (_event, { trackId, videoId }) => {
        const db = getDB();
        // Set the video_id column for this track so we avoid re-searching YouTube next time
        return db.prepare('UPDATE tracks SET video_id = ? WHERE id = ?').run(videoId, trackId);
    });

    // Downloads
    ipcMain.handle('download:start', async (_event, { track, options }) => {
        return await startDownload(track, options, mainWindow);
    });

    ipcMain.handle('download:cancel', async (_event, videoId) => {
        return cancelDownload(videoId);
    });

    // Lyrics
    ipcMain.handle('lyrics:get', async (_event, { artist, title, album, duration }) => {
        return await getLyrics(artist, title, album, duration);
    });

    ipcMain.handle('lyrics:fetchLRCLIB', async (_event, { searchArtist, searchTitle, saveArtist, saveTitle, duration }) => {
        return await fetchLRCLIB(searchArtist, searchTitle, saveArtist, saveTitle, duration);
    });

    // Playlists
    ipcMain.handle('playlist:create', (_event, { name, description }) => {
        const db = getDB();
        const stmt = db.prepare('INSERT INTO playlists (name, description) VALUES (?, ?)');
        const info = stmt.run(name, description);
        return { id: info.lastInsertRowid, name, description, created_at: new Date().toISOString() };
    });

    ipcMain.handle('playlist:getAll', () => {
        const db = getDB();
        return db.prepare('SELECT * FROM playlists ORDER BY created_at DESC').all();
    });

    ipcMain.handle('playlist:get', (_event, id) => {
        const db = getDB();
        const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id);
        if (!playlist) return null;

        const tracks = db.prepare(`
            SELECT t.*, pt.added_at 
            FROM tracks t
            JOIN playlist_tracks pt ON t.id = pt.track_id
            WHERE pt.playlist_id = ?
            ORDER BY pt.position ASC, pt.added_at ASC
        `).all(id);

        return { ...playlist, tracks };
    });

    // Library row id for a track; online songs get a `yt:<id>` row (same as saving a queue)
    const ensureTrackRow = (track: { id?: unknown; video_id?: string; title?: string; artist?: string; album?: string; duration?: number; image_path?: string; thumbnail?: string; source?: string }): number | null => {
        const db = getDB();
        if (typeof track.id === 'number' || /^\d+$/.test(String(track.id))) {
            const row = db.prepare('SELECT id FROM tracks WHERE id = ?').get(Number(track.id)) as { id: number } | undefined;
            if (row && (track.source === 'local' || !track.source || !track.video_id)) return row.id;
        }
        const videoId = track.video_id || (typeof track.id === 'string' ? track.id : '');
        if (!videoId || !track.title) return null;
        const existing = db.prepare('SELECT id FROM tracks WHERE video_id = ? OR path = ?').get(videoId, `yt:${videoId}`) as { id: number } | undefined;
        if (existing) return existing.id;
        return Number(db.prepare(`
            INSERT INTO tracks (title, artist, album, duration, path, image_path, source, video_id)
            VALUES (?, ?, ?, ?, ?, ?, 'youtube', ?)
        `).run(track.title, track.artist || '', track.album || '', track.duration || 0, `yt:${videoId}`, track.image_path || track.thumbnail || '', videoId).lastInsertRowid);
    };

    ipcMain.handle('playlist:addTrack', (_event, { playlistId, trackId: rawId, track }) => {
        const db = getDB();
        try {
            // YouTube songs have string ids that aren't library rows; they used to fail silently
            const trackId = track ? ensureTrackRow(track) : rawId;
            if (!trackId) return false;
            // Get current max position
            const maxPos = db.prepare('SELECT MAX(position) as val FROM playlist_tracks WHERE playlist_id = ?').get(playlistId) as { val: number };
            const nextPos = (maxPos?.val || 0) + 1;

            db.prepare('INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)')
                .run(playlistId, trackId, nextPos);
            return true;
        } catch (err) {
            console.error('Error adding track to playlist:', err);
            return false;
        }
    });

    ipcMain.handle('playlist:removeTrack', (_event, { playlistId, trackId }) => {
        const db = getDB();
        db.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?').run(playlistId, trackId);
        return true;
    });

    ipcMain.handle('playlist:delete', (_event, id) => {
        const db = getDB();
        db.prepare('DELETE FROM playlists WHERE id = ?').run(id);
        return true;
    });

    ipcMain.handle('playlist:updateImage', (_event, { playlistId, imagePath }) => {
        const db = getDB();
        db.prepare('UPDATE playlists SET image_path = ? WHERE id = ?').run(imagePath, playlistId);
        return true;
    });

    ipcMain.handle('playlist:saveQueue', (_event, { name, tracks }) => {
        const db = getDB();

        try {
            // 1. Create Playlist
            const stmt = db.prepare('INSERT INTO playlists (name, description) VALUES (?, ?)');
            const info = stmt.run(name, `Created from Queue on ${new Date().toLocaleDateString()}`);
            const playlistId = info.lastInsertRowid;

            // 2. Add Tracks
            const insertTrack = db.prepare(`
                INSERT INTO tracks (title, artist, album, duration, path, image_path, source, video_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const insertPlaylistTrack = db.prepare(`
                INSERT INTO playlist_tracks (playlist_id, track_id, position)
                VALUES (?, ?, ?)
            `);

            const findTrack = db.prepare('SELECT id FROM tracks WHERE video_id = ? OR path = ?');

            let position = 1;

            const transaction = db.transaction((tracksToAdd) => {
                for (const track of tracksToAdd) {
                    let trackId = null;

                    // If it's a local track with ID
                    if (track.source === 'local' && typeof track.id === 'number') {
                        trackId = track.id;
                    }
                    // If it's an online/video track
                    else if (track.video_id || (typeof track.id === 'string' && track.id.length > 5)) {
                        const videoId = track.video_id || track.id;
                        const fakePath = `yt:${videoId}`;

                        // Check if exists
                        const existing = findTrack.get(videoId, fakePath) as { id: number } | undefined;

                        if (existing) {
                            trackId = existing.id;
                        } else {
                            // Create new entry
                            try {
                                const res = insertTrack.run(
                                    track.title,
                                    track.artist,
                                    track.album || '',
                                    track.duration || 0,
                                    fakePath,
                                    track.image_path || track.thumbnail || '',
                                    'youtube',
                                    videoId
                                );
                                trackId = res.lastInsertRowid;
                            } catch (e) {
                                console.warn(`Skipping track ${track.title} due to insertion error:`, e);
                            }
                        }
                    }

                    if (trackId) {
                        try {
                            // Avoid duplicate key error if track is twice in queue (though acceptable for playlist?)
                            // Schema: PRIMARY KEY (playlist_id, track_id) implies unique track per playlist?
                            // Usually playlists allow duplicates. The schema says:
                            // PRIMARY KEY (playlist_id, track_id) -> Wait, this forbids duplicates!
                            // Standard playlist behavior is usually allowing duplicates at different positions.
                            // But my schema is strict. Let's ignore duplicates for now or fix schema later.
                            insertPlaylistTrack.run(playlistId, trackId, position++);
                        } catch (e) {
                            // Ignore duplicates
                        }
                    }
                }
            });

            transaction(tracks);
            return { success: true, playlistId, name };

        } catch (err) {
            console.error('Failed to save queue as playlist:', err);
            return { success: false, error: String(err) };
        }
    });

    // Metadata (MusicBrainz)
    ipcMain.handle('metadata:searchArtist', async (_event, query) => {
        return await searchArtists(query);
    });

    ipcMain.handle('metadata:getArtist', async (_event, mbid) => {
        return await getArtistById(mbid);
    });

    ipcMain.handle('metadata:getArtistInfo', async (_event, artistName) => {
        return await getArtistInfo(artistName);
    });

    ipcMain.handle('metadata:getAlbum', async (_event, mbid) => {
        const album = await getAlbumById(mbid);
        if (album) {
            const cover = await getCoverArt(mbid);
            return { ...album, cover };
        }
        return null;
    });

    ipcMain.handle('metadata:syncArtist', async (_event, artistName, opts?: { force?: boolean }) => {
        const db = getDB();
        // 1. Fetch from LastFM
        const lfmInfo = await getArtistInfo(artistName);
        if (!lfmInfo) return null;

        // 2. Download Image. A photo the user picked (or one already fetched) is kept unless a
        // refresh is asked for; this ran on every artist visit and replaced custom photos.
        const current = db.prepare('SELECT image_path FROM artists WHERE name = ?').get(artistName) as { image_path: string | null } | undefined;
        const keep = !opts?.force && current?.image_path && fs.existsSync(current.image_path) ? current.image_path : null;
        let localImagePath: string | null = keep;
        if (!keep && lfmInfo.image && lfmInfo.image.length > 0) {
            const imageUrl = lfmInfo.image[lfmInfo.image.length - 1]['#text'];
            if (imageUrl && !isLastfmPlaceholder(imageUrl)) {
                const ext = imageExt(imageUrl);
                localImagePath = await downloadAsset(imageUrl, 'artists', `${artistName}${ext}`);
            }
        }

        // 3. Save to DB
        db.prepare('INSERT OR IGNORE INTO artists (name) VALUES (?)').run(artistName);
        db.prepare(`
            UPDATE artists 
            SET bio = ?, image_path = ? 
            WHERE name = ?
        `).run(lfmInfo.bio?.content || null, localImagePath, artistName);

        return {
            bio: lfmInfo.bio?.content,
            image: localImagePath
        };
    });

    ipcMain.handle('metadata:syncAlbum', async (_event, { artist, album, force }: { artist: string; album: string; force?: boolean }) => {
        const db = getDB();
        // 1. Fetch from LastFM
        const lfmInfo = await getAlbumInfo(artist, album);
        if (!lfmInfo) return null;

        // 2. Download Image (a user-chosen cover is kept)
        const current = db.prepare('SELECT image_path FROM albums WHERE title = ?').get(album) as { image_path: string | null } | undefined;
        const keep = !force && current?.image_path && fs.existsSync(current.image_path) ? current.image_path : null;
        let localImagePath: string | null = keep;
        if (!keep && lfmInfo.image && lfmInfo.image.length > 0) {
            const imageUrl = lfmInfo.image[lfmInfo.image.length - 1]['#text'];
            if (imageUrl && !isLastfmPlaceholder(imageUrl)) {
                const ext = imageExt(imageUrl);
                localImagePath = await downloadAsset(imageUrl, 'albums', `${artist}-${album}${ext}`);
            }
        }

        // 3. Save to DB
        // Find album or create
        const row = db.prepare('SELECT id FROM albums WHERE title = ?').get(album) as { id: number } | undefined;
        if (row) {
            db.prepare(`
                UPDATE albums 
                SET image_path = ?, year = ?
                WHERE id = ?
            `).run(localImagePath, parseYear(lfmInfo.releasedate), row.id);
        }

        return {
            cover: localImagePath,
            year: parseYear(lfmInfo.releasedate)
        };
    });

    ipcMain.handle('artist:updateImage', async (_event, { artistName, imagePath }) => {
        const db = getDB();
        db.prepare('INSERT OR IGNORE INTO artists (name) VALUES (?)').run(artistName);
        db.prepare('UPDATE artists SET image_path = ? WHERE name = ?').run(imagePath, artistName);
        return true;
    });

    ipcMain.handle('album:updateImage', async (_event, { albumName, artistName, imagePath }) => {
        const db = getDB();
        const row = db.prepare('SELECT id FROM albums WHERE title = ?').get(albumName) as { id: number } | undefined;
        if (row) {
            db.prepare('UPDATE albums SET image_path = ? WHERE id = ?').run(imagePath, row.id);
        } else {
            const artistRow = db.prepare('SELECT id FROM artists WHERE name = ?').get(artistName) as { id: number } | undefined;
            const artistId = artistRow ? artistRow.id : null;
            db.prepare('INSERT INTO albums (title, artist_id, image_path) VALUES (?, ?, ?)').run(albumName, artistId, imagePath);
        }
        return true;
    });

    ipcMain.handle('library:updateArtistBio', async (_event, { name, bio }) => {
        const db = getDB();
        db.prepare('INSERT OR IGNORE INTO artists (name) VALUES (?)').run(name);
        db.prepare('UPDATE artists SET bio = ? WHERE name = ?').run(bio, name);
        return true;
    });
    // Settings
    ipcMain.handle('settings:get', (_event, key) => {
        const db = getDB();
        const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
        return row ? row.value : null;
    });

    ipcMain.handle('settings:set', (_event, { key, value }) => {
        const db = getDB();
        db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
        return true;
    });

    // History and Recommendations
    ipcMain.handle('library:markPlayed', (_event, track) => {
        const db = getDB();
        const sql = `
            INSERT INTO history (track_id, video_id, title, artist, album, duration, path, image_path, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Only set track_id if it references an existing library row (FKs are enforced)
        const isLocal = track.source === 'local' || !track.source;
        // (Favourites store ids as strings, so accept numeric strings too)
        const numericId = /^\d+$/.test(String(track.id)) ? Number(track.id) : null;
        const trackId = isLocal && numericId !== null
            && db.prepare('SELECT 1 FROM tracks WHERE id = ?').get(numericId) ? numericId : null;

        return db.prepare(sql).run(
            trackId,
            track.video_id || (track.source !== 'local' ? (track.youtubeId || track.id) : null),
            track.title,
            track.artist,
            track.album,
            track.duration,
            // Online songs are stored as `yt:<id>`, not the temporary cache/stream path they
            // played from, so History and Stats can still replay them after the cache is cleared
            (track.source === 'youtube' || track.source === 'ytmusic') && (track.video_id || typeof track.id === 'string')
                ? `yt:${track.video_id || track.id}`
                : track.path || null,
            track.image_path || track.thumbnail,
            track.source || 'local'
        );
    });

    ipcMain.handle('library:getRecentlyPlayed', (_event, limit = 20) => {
        const db = getDB();
        return db.prepare(`
            SELECT 
                h.id as history_id,
                COALESCE(t.id, h.track_id, h.video_id) as id,
                COALESCE(t.title, h.title) as title,
                COALESCE(t.artist, h.artist) as artist,
                COALESCE(t.album, h.album) as album,
                COALESCE(t.duration, h.duration) as duration,
                COALESCE(t.path, h.path) as path,
                COALESCE(t.image_path, h.image_path) as image_path,
                COALESCE(t.source, h.source) as source,
                COALESCE(t.video_id, h.video_id) as video_id,
                h.played_at
            FROM history h
            LEFT JOIN tracks t ON h.track_id = t.id
            ORDER BY h.played_at DESC 
            LIMIT ?
        `).all(limit);
    });

    ipcMain.handle('library:clearHistory', () => {
        const db = getDB();
        return db.prepare('DELETE FROM history').run();
    });

    ipcMain.handle('youtube:getRecommendations', async (_event, mood: string) => {
        const db = getDB();

        // Check cache first (per mood, refresh once a day)
        const cached = db.prepare(`
            SELECT * FROM recommendations 
            WHERE mood = ? AND cached_at > datetime('now', '-1 day')
        `).all(mood);

        if (cached.length >= 5) {
            return cached;
        }

        // Fetch new recommendations using YouTube API search or yt-dlp fallback
        try {
            const apiKeyRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('youtube_api_key') as { value: string } | undefined;
            const searchQuery = `${mood} mood songs playlist`;
            let items: { video_id: string; title: string; artist: string; thumbnail?: string }[] = [];

            if (apiKeyRow && apiKeyRow.value) {
                const res = await axios.get('https://www.googleapis.com/youtube/v3/search', {
                    params: {
                        part: 'snippet',
                        q: searchQuery,
                        type: 'video',
                        videoCategoryId: '10', // Music
                        maxResults: 15,
                        key: apiKeyRow.value
                    }
                });

                type ApiItem = { id: { videoId?: string }; snippet: { title: string; channelTitle: string; thumbnails: { high?: { url: string } } } };
                // The Data API returns HTML-escaped titles ("Don&#39;t"); decode them
                items = (res.data.items as ApiItem[]).map(item => ({
                    video_id: item.id.videoId || '',
                    title: decodeHtml(item.snippet.title),
                    artist: decodeHtml(item.snippet.channelTitle),
                    thumbnail: item.snippet.thumbnails.high?.url
                })).filter(item => item.video_id);
            } else {
                // FALLBACK: Use yt-dlp scraping via searchYTMusic
                const fallbackItems = await searchYTMusic(searchQuery, 15);
                items = fallbackItems.map(item => ({
                    video_id: item.id,
                    title: item.title || '',
                    artist: item.artist,
                    thumbnail: item.thumbnail
                })).filter(item => item.video_id);
            }

            if (items.length === 0) return [];

            // Clear old recommendations for THIS mood and save new ones
            db.prepare('DELETE FROM recommendations WHERE mood = ?').run(mood);
            const insert = db.prepare(`
                INSERT INTO recommendations (mood, video_id, title, artist, thumbnail)
                VALUES (?, ?, ?, ?, ?)
            `);

            for (const item of items) {
                try {
                    insert.run(mood, item.video_id, item.title, item.artist, item.thumbnail);
                } catch (e) {
                    // Ignore duplicates if they somehow happen
                }
            }

            return items;
        } catch (err) {
            console.error('Failed to fetch mood recommendations:', err);
            return [];
        }
    });

    // Page Caching Handlers
    const pageCache = new Map();
    ipcMain.handle('youtube:cacheAudio', async (event, videoId) => {
        const { cacheAudio } = await import('../services/ytdlp.js');
        return await cacheAudio(videoId, event.sender);
    });

    ipcMain.handle('youtube:cancelCacheAudio', async () => {
        const { cancelCacheAudio } = await import('../services/ytdlp.js');
        return cancelCacheAudio();
    });

    ipcMain.handle('cache:set', (_event, { key, data }) => {
        // Bound the cache so long sessions don't grow memory unbounded
        if (pageCache.size >= 200) pageCache.delete(pageCache.keys().next().value);
        pageCache.set(key, { data, timestamp: Date.now() });
    });

    ipcMain.handle('cache:get', (_event, key) => {
        const cached = pageCache.get(key);
        if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour cache
            return cached.data;
        }
        return null;
    });

    // Library Artists/Albums
    ipcMain.handle('library:getArtists', () => {
        const db = getDB();
        return db.prepare('SELECT DISTINCT artist FROM tracks ORDER BY artist ASC').all();
    });

    ipcMain.handle('library:getAlbums', () => {
        const db = getDB();
        // One row per album/artist (DISTINCT over image_path produced duplicates)
        return db.prepare(`
            SELECT album, artist, MAX(image_path) as image_path
            FROM tracks GROUP BY album, artist ORDER BY album ASC
        `).all();
    });
}
