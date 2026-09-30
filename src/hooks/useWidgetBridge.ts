import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { useThemeStore } from '../store/themeStore';
import { useFavoritesStore } from '../store/favoritesStore';
import { toAtmusicUrl } from '../utils/path';
import type { Track } from '../types/library';

export interface WidgetPlayerState {
    title: string;
    artist: string;
    album: string;
    artwork: string;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    loop: 'none' | 'one' | 'all';
    shuffle: boolean;
    isFavorite: boolean;
    appearance: string;
    hasTrack: boolean;
    volume: number;
    /** Next few queued tracks (for the phone remote) */
    queue: { title: string; artist: string; artwork: string }[];
}

export type WidgetCommand =
    | { type: 'playPause' | 'next' | 'prev' | 'toggleFavorite' | 'toggleShuffle' | 'toggleLoop' }
    | { type: 'seek' | 'volume' | 'playQueueIndex'; value?: number; index?: number }
    | { type: 'playTrack' | 'enqueue'; track: Track };

// Queue summary is rebuilt only when the queue array changes, so the snapshot
// comparison below stays cheap (same reference = unchanged).
let queueRef: Track[] | null = null;
let queueSummary: WidgetPlayerState['queue'] = [];
function summariseQueue(queue: Track[]) {
    if (queue !== queueRef) {
        queueRef = queue;
        queueSummary = queue.slice(0, 50).map(t => ({
            title: t.title || '', artist: t.artist || '',
            artwork: /^https?:/.test(t.thumbnail || t.image_path || '') ? (t.thumbnail || t.image_path || '') : '',
        }));
    }
    return queueSummary;
}

/** Remote/search results arrive as plain JSON; keep only what the player needs */
function sanitizeTrack(t: Partial<Track> | undefined): Track | null {
    if (!t || !t.id || !t.title) return null;
    return { ...t, id: t.id, title: String(t.title) } as Track;
}

function snapshot(): WidgetPlayerState {
    const s = usePlayerStore.getState();
    const t = s.currentTrack;
    const favId = t?.id?.toString() ?? '';
    return {
        title: t?.title || '',
        artist: t?.artist || '',
        album: t?.album || '',
        artwork: toAtmusicUrl(t?.image_path || t?.thumbnail || ''),
        isPlaying: s.isPlaying,
        currentTime: s.currentTime,
        duration: s.duration,
        loop: s.loop,
        shuffle: s.shuffle,
        isFavorite: favId ? useFavoritesStore.getState().isFavorite(favId) : false,
        appearance: useThemeStore.getState().appearance,
        hasTrack: !!t,
        volume: s.volume,
        queue: summariseQueue(s.queue),
    };
}

/**
 * Mirrors player state to the desktop widget window (via the main process) and
 * executes commands the widget sends back. Time updates are throttled to 1/s;
 * everything else is sent immediately.
 */
export function useWidgetBridge() {
    useEffect(() => {
        const ipc = window.ipcRenderer;
        if (!ipc?.send) return;

        let lastTimeSent = 0;
        let last = snapshot();
        ipc.send('widget:state', last);

        const push = () => {
            const next = snapshot();
            const onlyTimeChanged = (Object.keys(next) as (keyof WidgetPlayerState)[])
                .every(k => k === 'currentTime' || next[k] === last[k]);
            const now = Date.now();
            if (onlyTimeChanged && now - lastTimeSent < 1000) return;
            lastTimeSent = now;
            last = next;
            ipc.send('widget:state', next);
        };

        const unsubs = [
            usePlayerStore.subscribe(push),
            useFavoritesStore.subscribe(push),
            useThemeStore.subscribe(push),
        ];

        const offCommand = ipc.on('player:command', (_event, command: WidgetCommand) => {
            const s = usePlayerStore.getState();
            switch (command?.type) {
                case 'playPause':
                    if (s.isPlaying) s.pause(); else s.play();
                    break;
                case 'next': s.next(); break;
                case 'prev': s.prev(); break;
                case 'toggleShuffle': s.toggleShuffle(); break;
                case 'toggleLoop': s.toggleLoop(); break;
                case 'seek': if (typeof command.value === 'number') s.seek(command.value); break;
                case 'volume':
                    if (typeof command.value === 'number') s.setVolume(Math.min(1, Math.max(0, command.value)));
                    break;
                case 'playQueueIndex': {
                    const i = command.index ?? -1;
                    const track = s.queue[i];
                    if (!track) break;
                    s.reorderQueue(s.queue.slice(i + 1));
                    s.play(track);
                    break;
                }
                case 'playTrack': {
                    const track = sanitizeTrack(command.track);
                    if (track) s.play(track);
                    break;
                }
                case 'enqueue': {
                    const track = sanitizeTrack(command.track);
                    if (track) s.addToQueue(track);
                    break;
                }
                case 'toggleFavorite': {
                    const t = s.currentTrack;
                    if (!t) break;
                    const id = t.id?.toString();
                    const fav = useFavoritesStore.getState();
                    if (fav.isFavorite(id)) fav.removeFavorite(id);
                    else fav.addFavorite({ ...t, id, type: 'song' });
                    break;
                }
            }
        });

        return () => {
            unsubs.forEach(u => u());
            offCommand?.();
        };
    }, []);
}
