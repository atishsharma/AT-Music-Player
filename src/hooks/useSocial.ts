import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { onListening } from './useListening';
import type { Track } from '../types/library';

const cleanArtist = (a?: string) => (a || '').replace(/\s+-\s+Topic$/i, '').trim();

function scrobbleInfo(t: Track, duration: number) {
    return { artist: cleanArtist(t.artist), track: t.title, album: t.album && t.album !== 'Unknown Album' ? t.album : undefined, duration: duration || undefined };
}

/**
 * Discord Rich Presence + Last.fm scrobbling. The main process decides whether each
 * is enabled; this just reports what's playing. A song scrobbles once it has been
 * heard for half its length or 4 minutes (Last.fm's rule), and only if > 30 s long.
 */
export function useSocial() {
    useEffect(() => {
        const ipc = window.ipcRenderer;
        if (!ipc?.send) return;
        let scrobbled = false;

        const presence = () => {
            const s = usePlayerStore.getState();
            const t = s.currentTrack;
            const art = t?.thumbnail || t?.image_path || '';
            ipc.send('presence:update', t ? {
                title: t.title,
                artist: cleanArtist(t.artist),
                album: t.album,
                duration: s.duration || t.duration,
                position: s.currentTime,
                isPlaying: s.isPlaying,
                artwork: /^https:\/\//.test(art) ? art : undefined,
            } : null);
        };

        const offListen = onListening((event, session) => {
            const duration = usePlayerStore.getState().duration || session.track.duration || 0;
            if (event === 'start') {
                scrobbled = false;
                ipc.send('scrobble:nowPlaying', scrobbleInfo(session.track, session.track.duration || 0));
                return;
            }
            if (event === 'progress' && !scrobbled && duration > 30 && session.heard >= Math.min(duration / 2, 240)) {
                scrobbled = true;
                ipc.send('scrobble:submit', { ...scrobbleInfo(session.track, duration), timestamp: session.startedAt });
            }
        });

        presence();
        const unsub = usePlayerStore.subscribe((s, prev) => {
            if (s.currentTrack !== prev.currentTrack || s.isPlaying !== prev.isPlaying || s.lastSeekTime !== prev.lastSeekTime
                || (s.duration !== prev.duration && Number.isFinite(s.duration))) presence();
        });

        return () => { offListen(); unsub(); };
    }, []);
}
