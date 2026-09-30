import { ipcMain } from 'electron';
import { getDB } from '../db';

/**
 * Smart playlists: saved rules evaluated against the library on every open, so
 * they update themselves. Rules are data (field/op/value) turned into SQL through
 * a whitelist — no rule text ever reaches the query directly.
 */

export type RuleField = 'title' | 'artist' | 'album' | 'duration' | 'plays' | 'plays30' | 'added' | 'lastPlayed' | 'source';
export interface Rule { field: RuleField; op: string; value: string | number }
export interface SmartDef {
    id?: number | string;
    name: string;
    match: 'all' | 'any';
    rules: Rule[];
    sort: 'plays' | 'added' | 'lastPlayed' | 'title' | 'artist' | 'random';
    limit: number;
    builtin?: boolean;
    description?: string;
}

const TEXT_FIELDS: Record<string, string> = { title: 'x.title', artist: 'x.artist', album: 'x.album' };
const NUM_FIELDS: Record<string, string> = { duration: 'x.duration', plays: 'x.plays', plays30: 'x.plays30' };
const SORTS: Record<SmartDef['sort'], string> = {
    plays: 'x.plays DESC, x.last_played DESC',
    added: 'x.created_at DESC',
    lastPlayed: 'x.last_played IS NULL, x.last_played DESC',
    title: 'x.title COLLATE NOCASE ASC',
    artist: 'x.artist COLLATE NOCASE ASC, x.album COLLATE NOCASE ASC',
    random: 'RANDOM()',
};

export const BUILTINS: SmartDef[] = [
    { id: 'b-top', builtin: true, name: 'Most played', description: 'Your 50 most played songs', match: 'all', rules: [{ field: 'plays', op: 'gt', value: 0 }], sort: 'plays', limit: 50 },
    { id: 'b-repeat', builtin: true, name: 'On repeat', description: 'Played 3+ times this month', match: 'all', rules: [{ field: 'plays30', op: 'gt', value: 2 }], sort: 'plays', limit: 50 },
    { id: 'b-new', builtin: true, name: 'Recently added', description: 'Added in the last 30 days', match: 'all', rules: [{ field: 'added', op: 'within', value: 30 }], sort: 'added', limit: 100 },
    { id: 'b-forgotten', builtin: true, name: 'Forgotten favourites', description: 'Loved once, not played in 2 months', match: 'all', rules: [{ field: 'plays', op: 'gt', value: 2 }, { field: 'lastPlayed', op: 'notWithin', value: 60 }], sort: 'plays', limit: 50 },
    { id: 'b-unplayed', builtin: true, name: 'Never played', description: 'Songs waiting for their first listen', match: 'all', rules: [{ field: 'plays', op: 'eq', value: 0 }], sort: 'random', limit: 100 },
];

function ruleSql(r: Rule): { sql: string; params: unknown[] } | null {
    const v = r.value;
    if (TEXT_FIELDS[r.field]) {
        const col = `COALESCE(${TEXT_FIELDS[r.field]}, '')`;
        const s = String(v ?? '');
        switch (r.op) {
            case 'contains': return { sql: `${col} LIKE ? ESCAPE '\\'`, params: [`%${escapeLike(s)}%`] };
            case 'notContains': return { sql: `${col} NOT LIKE ? ESCAPE '\\'`, params: [`%${escapeLike(s)}%`] };
            case 'is': return { sql: `${col} = ? COLLATE NOCASE`, params: [s] };
            case 'startsWith': return { sql: `${col} LIKE ? ESCAPE '\\'`, params: [`${escapeLike(s)}%`] };
        }
        return null;
    }
    if (NUM_FIELDS[r.field]) {
        const n = Number(v);
        if (!Number.isFinite(n)) return null;
        const col = `COALESCE(${NUM_FIELDS[r.field]}, 0)`;
        const val = r.field === 'duration' ? n * 60 : n; // duration rules are in minutes
        switch (r.op) {
            case 'gt': return { sql: `${col} > ?`, params: [val] };
            case 'lt': return { sql: `${col} < ?`, params: [val] };
            case 'eq': return { sql: `${col} = ?`, params: [val] };
        }
        return null;
    }
    if (r.field === 'added' || r.field === 'lastPlayed') {
        const days = Math.max(0, Math.floor(Number(v)));
        if (!Number.isFinite(days)) return null;
        const col = r.field === 'added' ? 'x.created_at' : 'x.last_played';
        const since = `datetime('now', ?)`;
        const p = `-${days} days`;
        if (r.op === 'within') return { sql: `${col} >= ${since}`, params: [p] };
        if (r.op === 'notWithin') return { sql: `(${col} IS NULL OR ${col} < ${since})`, params: [p] };
        return null;
    }
    if (r.field === 'source' && r.op === 'is') {
        return String(v) === 'local'
            ? { sql: "COALESCE(x.source, 'local') = 'local'", params: [] }
            : { sql: "x.source IN ('youtube', 'ytmusic', 'ytdlp')", params: [] };
    }
    return null;
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, c => '\\' + c);

export function runSmart(def: SmartDef) {
    const parts = (def.rules || []).map(ruleSql).filter(Boolean) as { sql: string; params: unknown[] }[];
    const where = parts.length ? parts.map(p => `(${p.sql})`).join(def.match === 'any' ? ' OR ' : ' AND ') : '1 = 1';
    const params = parts.flatMap(p => p.params);
    const order = SORTS[def.sort] || SORTS.title;
    const limit = Math.min(1000, Math.max(1, Math.floor(Number(def.limit) || 100)));
    return getDB().prepare(`
        WITH p AS (
            SELECT LOWER(title) AS lt, LOWER(COALESCE(artist, '')) AS la, COUNT(*) AS n, MAX(played_at) AS last,
                   SUM(played_at >= datetime('now', '-30 days')) AS n30
            FROM history GROUP BY lt, la
        ),
        x AS (
            SELECT t.*, COALESCE(p.n, 0) AS plays, COALESCE(p.n30, 0) AS plays30, p.last AS last_played
            FROM tracks t LEFT JOIN p ON p.lt = LOWER(t.title) AND p.la = LOWER(COALESCE(t.artist, ''))
        )
        SELECT x.* FROM x WHERE ${where} ORDER BY ${order} LIMIT ${limit}
    `).all(...params);
}

function rowToDef(row: { id: number; name: string; rules: string; match: string; sort: string; lim: number }): SmartDef {
    let rules: Rule[] = [];
    try { rules = JSON.parse(row.rules); } catch { /* keep empty */ }
    return { id: row.id, name: row.name, rules, match: row.match === 'any' ? 'any' : 'all', sort: (row.sort as SmartDef['sort']) || 'title', limit: row.lim || 100 };
}

function findDef(id: string | number): SmartDef | null {
    const builtin = BUILTINS.find(b => b.id === id);
    if (builtin) return builtin;
    const row = getDB().prepare('SELECT * FROM smart_playlists WHERE id = ?').get(Number(id));
    return row ? rowToDef(row as never) : null;
}

export function registerSmartHandlers() {
    getDB().exec(`
        CREATE TABLE IF NOT EXISTS smart_playlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            rules TEXT NOT NULL DEFAULT '[]',
            match TEXT NOT NULL DEFAULT 'all',
            sort TEXT NOT NULL DEFAULT 'title',
            lim INTEGER NOT NULL DEFAULT 100,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    ipcMain.handle('smart:list', () => {
        const own = (getDB().prepare('SELECT * FROM smart_playlists ORDER BY created_at DESC').all() as never[]).map(rowToDef);
        return [...BUILTINS, ...own].map(d => {
            let count = 0;
            try { count = runSmart(d).length; } catch { /* bad rule set */ }
            return { ...d, count };
        });
    });

    ipcMain.handle('smart:get', (_event, id: string | number) => {
        const def = findDef(id);
        return def ? { ...def, tracks: runSmart(def) } : null;
    });

    ipcMain.handle('smart:preview', (_event, def: SmartDef) => {
        try { return { count: runSmart({ ...def, limit: def.limit || 1000 }).length }; } catch { return { count: 0 }; }
    });

    ipcMain.handle('smart:save', (_event, def: SmartDef) => {
        const name = String(def.name || '').trim().slice(0, 120) || 'Smart playlist';
        const rules = JSON.stringify((def.rules || []).filter(r => ruleSql(r)));
        const match = def.match === 'any' ? 'any' : 'all';
        const sort = SORTS[def.sort] ? def.sort : 'title';
        const lim = Math.min(1000, Math.max(1, Math.floor(Number(def.limit) || 100)));
        const db = getDB();
        if (typeof def.id === 'number') {
            db.prepare('UPDATE smart_playlists SET name = ?, rules = ?, match = ?, sort = ?, lim = ? WHERE id = ?').run(name, rules, match, sort, lim, def.id);
            return def.id;
        }
        return Number(db.prepare('INSERT INTO smart_playlists (name, rules, match, sort, lim) VALUES (?, ?, ?, ?, ?)').run(name, rules, match, sort, lim).lastInsertRowid);
    });

    ipcMain.handle('smart:delete', (_event, id: number) => {
        getDB().prepare('DELETE FROM smart_playlists WHERE id = ?').run(Number(id));
        return true;
    });
}
