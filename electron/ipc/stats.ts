import { ipcMain, dialog, BrowserWindow } from 'electron';
import { writeFile } from 'fs/promises';
import { getDB } from '../db';

export type StatsRange = 'week' | 'month' | 'year' | 'all' | `y${number}`;

// Seconds actually listened; older rows (before tracking) fall back to the song length
const LISTENED = 'COALESCE(h.listened, h.duration, 0)';
const LOCAL = "'localtime'";

/** WHERE clause for a range. Only whitelisted shapes reach SQL. */
function rangeWhere(range: StatsRange): { sql: string; params: unknown[] } {
    if (range === 'week') return { sql: "h.played_at >= datetime('now', '-7 days')", params: [] };
    if (range === 'month') return { sql: "h.played_at >= datetime('now', '-30 days')", params: [] };
    if (range === 'year') return { sql: "h.played_at >= datetime('now', '-365 days')", params: [] };
    const m = /^y(\d{4})$/.exec(range);
    if (m) return { sql: `strftime('%Y', h.played_at, ${LOCAL}) = ?`, params: [m[1]] };
    return { sql: '1 = 1', params: [] };
}

export function getStats(range: StatsRange) {
    const db = getDB();
    const { sql: where, params } = rangeWhere(range);
    // A "play" counts once someone listened ≥ 30 s (or the whole song, if shorter)
    const counted = `${where} AND (h.listened IS NULL OR h.listened >= MIN(30, COALESCE(h.duration, 30) * 0.9))`;

    const totals = db.prepare(`
        SELECT COUNT(*) AS plays,
               ROUND(SUM(${LISTENED}) / 60.0) AS minutes,
               COUNT(DISTINCT LOWER(h.title) || '|' || LOWER(COALESCE(h.artist, ''))) AS songs,
               COUNT(DISTINCT LOWER(COALESCE(h.artist, ''))) AS artists,
               MIN(h.played_at) AS first
        FROM history h WHERE ${counted}
    `).get(...params);

    const topTracks = db.prepare(`
        SELECT h.title, h.artist, MAX(h.image_path) AS image_path, COUNT(*) AS plays,
               ROUND(SUM(${LISTENED}) / 60.0) AS minutes,
               MAX(h.video_id) AS video_id, MAX(h.track_id) AS track_id, MAX(h.path) AS path,
               MAX(h.source) AS source, MAX(h.duration) AS duration, MAX(h.album) AS album
        FROM history h WHERE ${counted}
        GROUP BY LOWER(h.title), LOWER(COALESCE(h.artist, ''))
        ORDER BY plays DESC, minutes DESC LIMIT 10
    `).all(...params);

    const topArtists = db.prepare(`
        SELECT h.artist AS name, MAX(h.image_path) AS image_path, COUNT(*) AS plays,
               ROUND(SUM(${LISTENED}) / 60.0) AS minutes
        FROM history h WHERE ${counted} AND COALESCE(h.artist, '') <> ''
        GROUP BY LOWER(h.artist) ORDER BY minutes DESC, plays DESC LIMIT 10
    `).all(...params);

    const topAlbums = db.prepare(`
        SELECT h.album AS title, h.artist, MAX(h.image_path) AS image_path, COUNT(*) AS plays
        FROM history h WHERE ${counted} AND COALESCE(h.album, '') NOT IN ('', 'Unknown Album')
        GROUP BY LOWER(h.album) ORDER BY plays DESC LIMIT 6
    `).all(...params);

    const byHour = db.prepare(`
        SELECT CAST(strftime('%H', h.played_at, ${LOCAL}) AS INTEGER) AS k, ROUND(SUM(${LISTENED}) / 60.0) AS minutes
        FROM history h WHERE ${counted} GROUP BY k
    `).all(...params) as { k: number; minutes: number }[];

    const byWeekday = db.prepare(`
        SELECT CAST(strftime('%w', h.played_at, ${LOCAL}) AS INTEGER) AS k, ROUND(SUM(${LISTENED}) / 60.0) AS minutes
        FROM history h WHERE ${counted} GROUP BY k
    `).all(...params) as { k: number; minutes: number }[];

    const daily = db.prepare(`
        SELECT date(h.played_at, ${LOCAL}) AS day, ROUND(SUM(${LISTENED}) / 60.0) AS minutes
        FROM history h WHERE ${counted} GROUP BY day ORDER BY day
    `).all(...params) as { day: string; minutes: number }[];

    const years = (db.prepare(`
        SELECT DISTINCT strftime('%Y', played_at, ${LOCAL}) AS y FROM history ORDER BY y DESC
    `).all() as { y: string }[]).map(r => Number(r.y)).filter(Boolean);

    const hours = Array.from({ length: 24 }, (_, i) => byHour.find(r => r.k === i)?.minutes ?? 0);
    const weekdays = Array.from({ length: 7 }, (_, i) => byWeekday.find(r => r.k === i)?.minutes ?? 0);

    return { range, totals, topTracks, topArtists, topAlbums, hours, weekdays, daily, streak: streaks(daily.map(d => d.day)), years };
}

/** Longest run of consecutive listening days, and the run ending today/yesterday */
function streaks(days: string[]) {
    let best = 0, run = 0, prev = 0;
    const DAY = 86_400_000;
    for (const d of days) {
        const t = Date.parse(d + 'T00:00:00Z');
        run = prev && t - prev === DAY ? run + 1 : 1;
        best = Math.max(best, run);
        prev = t;
    }
    const today = Date.parse(new Date().toLocaleDateString('en-CA') + 'T00:00:00Z');
    const current = prev && today - prev <= DAY ? run : 0;
    return { best, current };
}

export function registerStatsHandlers() {
    ipcMain.handle('stats:get', (_event, range: StatsRange = 'month') => getStats(range));

    // Seconds actually heard for the most recent play of a song (sent when the song changes)
    ipcMain.handle('history:setListened', (_event, { title, artist, seconds }: { title: string; artist: string; seconds: number }) => {
        if (!title || !Number.isFinite(seconds)) return;
        getDB().prepare(`
            UPDATE history SET listened = ?
            WHERE id = (SELECT MAX(id) FROM history WHERE title = ? AND COALESCE(artist, '') = COALESCE(?, ''))
        `).run(Math.round(seconds), title, artist ?? '');
    });

    // Save a PNG the renderer drew (the yearly recap card)
    ipcMain.handle('file:savePng', async (event, { dataUrl, name }: { dataUrl: string; name: string }) => {
        const m = /^data:image\/png;base64,(.+)$/.exec(dataUrl || '');
        if (!m) return null;
        const { canceled, filePath } = await dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender)!, {
            defaultPath: name.replace(/[\\/:*?"<>|]/g, '') || 'recap.png',
            filters: [{ name: 'PNG image', extensions: ['png'] }],
        });
        if (canceled || !filePath) return null;
        await writeFile(filePath, Buffer.from(m[1], 'base64'));
        return filePath;
    });
}
