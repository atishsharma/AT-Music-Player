import axios from 'axios';
import { getDB } from '../db';

// LRCLIB API: https://lrclib.net/api/search?q=...
// or https://lrclib.net/api/get?artist_name=...&track_name=...&album_name=...&duration=...

function parseLRC(lrc: string | null) {
    if (!lrc) return [];
    const lines = lrc.split('\n');
    const result: any[] = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

    for (const line of lines) {
        const match = timeRegex.exec(line);
        if (match) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const milliseconds = parseInt(match[3]);
            const time = minutes * 60 + seconds + milliseconds / (match[3].length === 3 ? 1000 : 100);
            const content = line.replace(timeRegex, '').trim();
            if (content) {
                result.push({ seconds: time, content });
            }
        }
    }
    return result;
}

export async function getLyrics(artist: string, title: string, album?: string, duration?: number) {
    const db = getDB();

    // 1. Check local cache
    try {
        const row = db.prepare('SELECT * FROM lyrics_cache WHERE title LIKE ? AND artist LIKE ?')
            .get(title, artist) as { plain_lyrics: string, synced_lyrics: string } | undefined;

        if (row) {
            console.log('Lyrics found in cache');
            return {
                plainLyrics: row.plain_lyrics,
                syncedLyrics: parseLRC(row.synced_lyrics),
                isSynced: !!row.synced_lyrics
            };
        }
    } catch (err) {
        console.error('Error checking lyrics cache:', err);
    }

    // 2. Fetch from API
    try {
        const params: any = {
            artist_name: artist,
            track_name: title,
        };
        if (album) params.album_name = album;
        if (duration) params.duration = duration;

        const response = await axios.get('https://lrclib.net/api/get', { params });

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
                isSynced: !!data.syncedLyrics
            };
        }
        return null;
    } catch (error) {
        try {
            const searchRes = await axios.get('https://lrclib.net/api/search', {
                params: { q: `${title} ${artist}` }
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
                    isSynced: !!bestMatch.syncedLyrics
                };
            }
        } catch (searchError) {
            console.error('Lyrics Search Error:', searchError);
        }
        return null;
    }
}
