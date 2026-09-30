import axios from 'axios';
import { getDB } from '../db';

// LRCLIB API: https://lrclib.net/api/search?q=...
// or https://lrclib.net/api/get?artist_name=...&track_name=...&album_name=...&duration=...

function parseLRC(lrc: string | null) {
    if (!lrc) return [];
    const result: { seconds: number; content: string }[] = [];
    // [mm:ss], [mm:ss.xx] or [mm:ss.xxx]; a line may carry several stamps ("[00:12.00][01:30.00] chorus"),
    // which used to leave the second stamp in the text and drop that repeat
    const stamp = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
    for (const line of lrc.split(/\r?\n/)) {
        const times: number[] = [];
        let m: RegExpExecArray | null;
        stamp.lastIndex = 0;
        while ((m = stamp.exec(line))) {
            const frac = m[3] ? parseInt(m[3], 10) / 10 ** m[3].length : 0;
            times.push(parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + frac);
        }
        if (!times.length) continue;
        const content = line.replace(stamp, '').trim();
        if (content) for (const seconds of times) result.push({ seconds, content });
    }
    return result.sort((a, b) => a.seconds - b.seconds);
}

export async function getLyrics(artist: string, title: string, album?: string, duration?: number) {
    const db = getDB();

    // 1. Check local cache
    try {
        const row = db.prepare('SELECT * FROM lyrics_cache WHERE title = ? COLLATE NOCASE AND artist = ? COLLATE NOCASE')
            .get(title, artist) as { plain_lyrics: string, synced_lyrics: string } | undefined;

        if (row) {
            console.log('Lyrics found in cache');
            return {
                plainLyrics: row.plain_lyrics,
                syncedLyrics: parseLRC(row.synced_lyrics),
                isSynced: parseLRC(row.synced_lyrics).length > 0
            };
        }
    } catch (err) {
        console.error('Error checking lyrics cache:', err);
    }

    // 2. Fetch from API
    try {
        const params: Record<string, string | number> = {
            artist_name: artist,
            track_name: title,
        };
        if (album) params.album_name = album;
        if (duration) params.duration = duration;

        const response = await axios.get('https://lrclib.net/api/get', { params, timeout: 8000 });

        if (response.data) {
            const data = response.data;
            // Save to Cache
            try {
                db.prepare(`
                    INSERT OR IGNORE INTO lyrics_cache (artist, title, plain_lyrics, synced_lyrics)
                    VALUES (?, ?, ?, ?)
                `).run(artist, title, data.plainLyrics || '', data.syncedLyrics || '');
            } catch (saveErr) {
                console.error('Failed to save lyrics to cache:', saveErr);
            }

            return {
                plainLyrics: data.plainLyrics,
                syncedLyrics: parseLRC(data.syncedLyrics),
                isSynced: parseLRC(data.syncedLyrics).length > 0
            };
        }
        return null;
    } catch (error) {
        try {
            const searchRes = await axios.get('https://lrclib.net/api/search', {
                params: { q: `${title} ${artist}` }, timeout: 8000
            });
            if (searchRes.data && searchRes.data.length > 0) {
                const bestMatch = searchRes.data[0];

                // Save to Cache
                try {
                    db.prepare(`
                        INSERT OR IGNORE INTO lyrics_cache (artist, title, plain_lyrics, synced_lyrics)
                        VALUES (?, ?, ?, ?)
                    `).run(artist, title, bestMatch.plainLyrics || '', bestMatch.syncedLyrics || '');
                } catch (saveErr) {
                    console.error('Failed to save searched lyrics to cache:', saveErr);
                }

                return {
                    plainLyrics: bestMatch.plainLyrics,
                    syncedLyrics: parseLRC(bestMatch.syncedLyrics),
                    isSynced: parseLRC(bestMatch.syncedLyrics).length > 0
                };
            }
        } catch (searchError) {
            console.error('Lyrics Search Error:', searchError);
        }
        return null;
    }
}

export async function fetchLRCLIB(searchArtist: string, searchTitle: string, saveArtist: string, saveTitle: string, duration?: number) {
    const db = getDB();

    // Fetch from API directly bypassing cache
    try {
        const params: Record<string, string | number> = {
            artist_name: searchArtist,
            track_name: searchTitle,
        };
        if (duration) params.duration = duration;

        const response = await axios.get('https://lrclib.net/api/get', { params, timeout: 8000 });

        if (response.data) {
            const data = response.data;
            try {
                // REPLACE will overwrite existing entry due to UNIQUE(artist, title)
                db.prepare(`
                    INSERT OR REPLACE INTO lyrics_cache (artist, title, plain_lyrics, synced_lyrics)
                    VALUES (?, ?, ?, ?)
                `).run(saveArtist, saveTitle, data.plainLyrics || '', data.syncedLyrics || '');
            } catch (saveErr) {
                console.error('Failed to update lyrics cache:', saveErr);
            }

            return {
                plainLyrics: data.plainLyrics,
                syncedLyrics: parseLRC(data.syncedLyrics),
                isSynced: parseLRC(data.syncedLyrics).length > 0
            };
        }
    } catch (error) {
        try {
            const searchRes = await axios.get('https://lrclib.net/api/search', {
                params: { q: `${searchTitle} ${searchArtist}` }, timeout: 8000
            });
            if (searchRes.data && searchRes.data.length > 0) {
                const bestMatch = searchRes.data[0];

                try {
                    db.prepare(`
                        INSERT OR REPLACE INTO lyrics_cache (artist, title, plain_lyrics, synced_lyrics)
                        VALUES (?, ?, ?, ?)
                    `).run(saveArtist, saveTitle, bestMatch.plainLyrics || '', bestMatch.syncedLyrics || '');
                } catch (saveErr) {
                    console.error('Failed to update searched lyrics cache:', saveErr);
                }

                return {
                    plainLyrics: bestMatch.plainLyrics,
                    syncedLyrics: parseLRC(bestMatch.syncedLyrics),
                    isSynced: parseLRC(bestMatch.syncedLyrics).length > 0
                };
            }
        } catch (searchError) {
            console.error('Lyrics Search Error:', searchError);
        }
    }
    return null;
}
