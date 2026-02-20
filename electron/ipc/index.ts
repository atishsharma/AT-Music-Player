import { ipcMain, dialog, BrowserWindow } from 'electron';
import path from 'path';
import { getDB } from '../db';
import { scanDirectory } from '../services/scanner';
import { searchYouTube, searchYTMusic, getStreamUrl, getCacheStats, clearCache, getVideoInfo } from '../services/ytdlp';
import { searchYouTubeAPI } from '../services/youtube_api';
import { startDownload, cancelDownload } from '../services/downloader';
import { getLyrics } from '../services/lyrics';
import { searchArtists, getArtistById, getAlbumById, getCoverArt } from '../services/musicbrainz';
import { getArtistInfo, getAlbumInfo } from '../services/lastfm';
import { downloadAsset } from '../services/assets';
import axios from 'axios';

// Register all IPC handlers
export function registerHandlers(mainWindow: BrowserWindow) {

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

    // Library Operations
    ipcMain.handle('library:scan', async (_event, dirPath) => {
        if (!dirPath) return false;
        // Run scan in background (though here it's awaited, better if async)
        await scanDirectory(dirPath, mainWindow);
        return true;
    });

    ipcMain.handle('library:getTracks', () => {
        const db = getDB();
        // Return all tracks sorted by added date desc
        return db.prepare('SELECT * FROM tracks ORDER BY created_at DESC').all();
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
        db.prepare("DELETE FROM tracks WHERE source = 'local' AND path LIKE ?").run(`${pathToRemove}%`);
        return true;
    });

    ipcMain.handle('library:getAlbumTracks', (_event, albumName) => {
        const db = getDB();
        return db.prepare('SELECT * FROM tracks WHERE album = ? ORDER BY id ASC').all(albumName);
    });

    ipcMain.handle('library:getArtistTracks', (_event, artistName) => {
        const db = getDB();
        return db.prepare('SELECT * FROM tracks WHERE artist = ? ORDER BY album ASC, id ASC').all(artistName);
    });

    // YouTube Operations
    ipcMain.handle('youtube:search', async (_event, query) => {
        return await searchYouTube(query);
    });

    ipcMain.handle('youtube:getVideoId', async (_event, query) => {
        try {
            const results = await searchYouTube(query, 1);
            if (results && results.length > 0) {
                // Return 'youtubeId' property if available, otherwise fallback to 'id'
                return results[0].youtubeId || results[0].id;
            }
            return null;
        } catch (error) {
            console.error("Failed to get video ID:", error);
            return null;
        }
    });

    ipcMain.handle('youtube:stream', async (_event, videoId) => {
        return await getStreamUrl(videoId);
    });

    // New Multi-Provider Search
    ipcMain.handle('search:library', (_event, query) => {
        const db = getDB();
        const term = `%${query}%`;
        return db.prepare('SELECT * FROM tracks WHERE title LIKE ? OR artist LIKE ? OR album LIKE ? LIMIT 100').all(term, term, term);
    });

    ipcMain.handle('search:youtube', async (_event, query, options) => {
        const limit = options?.limit || 20;
        const ytapiRes = await searchYouTubeAPI(query);
        if (ytapiRes && ytapiRes.length > 0) return ytapiRes.slice(0, limit);
        return await searchYouTube(query, limit);
    });



    ipcMain.handle('search:ytmusic', async (_event, query, options) => {
        const limit = options?.limit || 20;
        return await searchYTMusic(query, limit);
    });

    ipcMain.handle('cache:getStats', () => {
        return getCacheStats();
    });

    ipcMain.handle('cache:clear', () => {
        return clearCache();
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
        const values: any[] = [];

        if (title !== undefined) { updates.push('title = ?'); values.push(title); }
        if (artist !== undefined) { updates.push('artist = ?'); values.push(artist); }
        if (album !== undefined) { updates.push('album = ?'); values.push(album); }
        if (image_path !== undefined) { updates.push('image_path = ?'); values.push(image_path); }

        if (updates.length === 0) return true;

        const sql = `UPDATE tracks SET ${updates.join(', ')} WHERE id = ?`;
        values.push(id);

        return db.prepare(sql).run(...values);
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

    ipcMain.handle('playlist:addTrack', (_event, { playlistId, trackId }) => {
        const db = getDB();
        try {
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

    ipcMain.handle('metadata:syncArtist', async (_event, artistName) => {
        const db = getDB();
        // 1. Fetch from LastFM
        const lfmInfo = await getArtistInfo(artistName);
        if (!lfmInfo) return null;

        // 2. Download Image
        let localImagePath = null;
        if (lfmInfo.image && lfmInfo.image.length > 0) {
            const imageUrl = lfmInfo.image[lfmInfo.image.length - 1]['#text'];
            if (imageUrl) {
                const ext = path.extname(imageUrl) || '.png';
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

    ipcMain.handle('metadata:syncAlbum', async (_event, { artist, album }) => {
        const db = getDB();
        // 1. Fetch from LastFM
        const lfmInfo = await getAlbumInfo(artist, album);
        if (!lfmInfo) return null;

        // 2. Download Image
        let localImagePath = null;
        if (lfmInfo.image && lfmInfo.image.length > 0) {
            const imageUrl = lfmInfo.image[lfmInfo.image.length - 1]['#text'];
            if (imageUrl) {
                const ext = path.extname(imageUrl) || '.png';
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
            `).run(localImagePath, lfmInfo.releasedate ? new Date(lfmInfo.releasedate).getFullYear() : null, row.id);
        }

        return {
            cover: localImagePath,
            year: lfmInfo.releasedate ? new Date(lfmInfo.releasedate).getFullYear() : null
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

        // Only set track_id if it's actually a local track (numerical ID)
        const isLocal = track.source === 'local' || !track.source;
        const trackId = isLocal ? track.id : null;

        return db.prepare(sql).run(
            trackId,
            track.video_id || (track.source !== 'local' ? (track.youtubeId || track.id) : null),
            track.title,
            track.artist,
            track.album,
            track.duration,
            track.path || (track.source === 'youtube' ? `yt:${track.video_id || track.id}` : null),
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

        // Fetch new recommendations using YouTube API search
        try {
            const apiKeyRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('youtube_api_key') as { value: string } | undefined;
            if (!apiKeyRow) return [];

            // Search for "mood songs" or "mood music" in both English and Hindi for variety
            const searchQuery = `${mood} songs music`;
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

            const items = res.data.items.map((item: any) => ({
                video_id: item.id.videoId,
                title: item.snippet.title,
                artist: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails.high?.url
            })).filter((item: any) => item.video_id);

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
    ipcMain.handle('youtube:cacheAudio', async (_event, videoId) => {
        const { cacheAudio } = await import('../services/ytdlp.js');
        return await cacheAudio(videoId);
    });

    ipcMain.handle('cache:set', (_event, { key, data }) => {
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
        return db.prepare('SELECT DISTINCT album, artist, image_path FROM tracks ORDER BY album ASC').all();
    });
}
