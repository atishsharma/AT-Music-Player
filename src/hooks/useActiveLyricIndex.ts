import { usePlayerStore } from '../store/playerStore';

interface SyncedLine {
    seconds: number;
    content: string;
}

export function findActiveLyricIndex(lines: SyncedLine[] | undefined, time: number): number {
    if (!Array.isArray(lines) || lines.length === 0) return -1;
    // Binary search: last line whose timestamp is <= time
    let lo = 0;
    let hi = lines.length - 1;
    let found = -1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (lines[mid].seconds <= time) {
            found = mid;
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }
    return found;
}

/**
 * Index of the currently sung lyric line. Subscribes to playback time but only
 * triggers a re-render when the active line changes (not on every timeupdate).
 * Returns -1 while `enabled` is false so hidden views don't re-render at all.
 */
export function useActiveLyricIndex(lines: SyncedLine[] | undefined, enabled = true): number {
    return usePlayerStore(s => (enabled ? findActiveLyricIndex(lines, s.currentTime) : -1));
}
