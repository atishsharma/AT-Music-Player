import axios from 'axios';
import { createHash } from 'node:crypto';
import { getDB, getSetting } from '../db';

/**
 * Last.fm scrobbling (desktop auth flow): get a token, the user approves it in the
 * browser, then it's exchanged for a permanent session key. Scrobbles that fail
 * (offline) are queued and retried with the next one.
 */

const API = 'https://ws.audioscrobbler.com/2.0/';

export interface ScrobbleTrack { artist: string; track: string; album?: string; duration?: number; timestamp?: number }

const set = (key: string, value: string | null) => {
    const db = getDB();
    if (value === null) db.prepare('DELETE FROM settings WHERE key = ?').run(key);
    else db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
};

const creds = () => ({ key: getSetting('lastfm_api_key') || '', secret: getSetting('lastfm_api_secret') || '', sk: getSetting('lastfm_session') || '' });

function sign(params: Record<string, string>, secret: string) {
    const base = Object.keys(params).filter(k => k !== 'format' && k !== 'callback').sort().map(k => k + params[k]).join('');
    return createHash('md5').update(base + secret, 'utf8').digest('hex');
}

async function call(method: string, params: Record<string, string | number | undefined>, post = false) {
    const { key, secret } = creds();
    if (!key || !secret) throw new Error('Last.fm API key and secret are required');
    const p: Record<string, string> = { method, api_key: key };
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') p[k] = String(v);
    p.api_sig = sign(p, secret);
    p.format = 'json';
    const res = post
        ? await axios.post(API, new URLSearchParams(p).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 })
        : await axios.get(API, { params: p, timeout: 15000 });
    if (res.data?.error) throw new Error(res.data.message || `Last.fm error ${res.data.error}`);
    return res.data;
}

export function lastfmStatus() {
    const { key, secret, sk } = creds();
    return {
        hasKeys: !!key && !!secret,
        connected: !!sk,
        user: getSetting('lastfm_user') || '',
        enabled: getSetting('lastfm_scrobble') !== 'false',
        queued: queue().length,
    };
}

let pendingToken = '';

/** Step 1: returns the URL the user opens to approve access */
export async function lastfmBeginAuth() {
    const data = await call('auth.getToken', {});
    pendingToken = data.token;
    return `https://www.last.fm/api/auth/?api_key=${encodeURIComponent(creds().key)}&token=${encodeURIComponent(pendingToken)}`;
}

/** Step 2: after approval, exchange the token for a session */
export async function lastfmFinishAuth() {
    if (!pendingToken) throw new Error('Start the connection first');
    const data = await call('auth.getSession', { token: pendingToken });
    pendingToken = '';
    set('lastfm_session', data.session.key);
    set('lastfm_user', data.session.name);
    return lastfmStatus();
}

export function lastfmLogout() {
    set('lastfm_session', null);
    set('lastfm_user', null);
    return lastfmStatus();
}

const active = () => { const { sk } = creds(); return sk && getSetting('lastfm_scrobble') !== 'false' ? sk : ''; };

export async function lastfmNowPlaying(t: ScrobbleTrack) {
    const sk = active();
    if (!sk || !t.artist || !t.track) return;
    try {
        await call('track.updateNowPlaying', { artist: t.artist, track: t.track, album: t.album, duration: t.duration ? Math.round(t.duration) : undefined, sk }, true);
    } catch (err) { console.warn('Last.fm now playing failed:', (err as Error).message); }
}

function queue(): ScrobbleTrack[] {
    try { return JSON.parse(getSetting('lastfm_queue') || '[]'); } catch { return []; }
}

export async function lastfmScrobble(t: ScrobbleTrack) {
    const sk = active();
    if (!sk || !t.artist || !t.track) return;
    // Send this one plus anything queued while offline (max 50 per request)
    const batch = [...queue(), t].slice(-50);
    const params: Record<string, string | number | undefined> = { sk };
    batch.forEach((s, i) => {
        params[`artist[${i}]`] = s.artist;
        params[`track[${i}]`] = s.track;
        params[`timestamp[${i}]`] = s.timestamp;
        params[`album[${i}]`] = s.album;
        params[`duration[${i}]`] = s.duration ? Math.round(s.duration) : undefined;
    });
    try {
        await call('track.scrobble', params, true);
        set('lastfm_queue', null);
    } catch (err) {
        const msg = (err as Error).message;
        console.warn('Last.fm scrobble failed, queued:', msg);
        // Auth errors won't fix themselves by retrying the same session
        if (/Invalid session|Unauthorized/i.test(msg)) lastfmLogout();
        set('lastfm_queue', JSON.stringify(batch.slice(-200)));
    }
}
