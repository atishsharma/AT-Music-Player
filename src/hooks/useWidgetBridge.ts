import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { useThemeStore } from '../store/themeStore';
import { useFavoritesStore } from '../store/favoritesStore';
import { toAtmusicUrl } from '../utils/path';

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
}

export type WidgetCommand =
    | { type: 'playPause' | 'next' | 'prev' | 'toggleFavorite' | 'toggleShuffle' | 'toggleLoop' }
    | { type: 'seek'; value: number };

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
                case 'seek': s.seek(command.value); break;
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
