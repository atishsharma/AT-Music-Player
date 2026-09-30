import type { Track } from '../../types/library';

/** Compact YouTube song shape the home rows cache in localStorage */
export interface HomeSong { video_id: string; title: string; artist: string; thumbnail?: string }

export const toHomeSong = (item: Partial<Track> & { channelTitle?: string }): HomeSong => ({
    video_id: String(item.video_id || item.id || ''),
    title: item.title || '',
    artist: item.artist || item.channelTitle || '',
    thumbnail: item.thumbnail || item.image_path,
});

export const homeSongTrack = (item: HomeSong, album: string): Track => ({
    id: item.video_id,
    video_id: item.video_id,
    title: item.title,
    artist: item.artist,
    image_path: item.thumbnail,
    thumbnail: item.thumbnail,
    source: 'youtube',
    album,
    duration: 0,
    path: '',
    format: 'youtube',
});

/** Today's cached list, or null (missing, stale or corrupt) */
export function readDailyCache(key: string): HomeSong[] | null {
    try {
        const parsed = JSON.parse(localStorage.getItem(key) || 'null');
        return parsed?.date === new Date().toDateString() && Array.isArray(parsed.songs) ? parsed.songs : null;
    } catch {
        return null;
    }
}

export function writeDailyCache(key: string, songs: HomeSong[]) {
    try { localStorage.setItem(key, JSON.stringify({ date: new Date().toDateString(), songs })); } catch { /* storage full/blocked */ }
}
