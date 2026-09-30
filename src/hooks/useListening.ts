import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';
import type { Track } from '../types/library';

export interface ListenSession {
    track: Track;
    /** Epoch seconds when the song started */
    startedAt: number;
    /** Seconds actually heard (seeking doesn't count) */
    heard: number;
}

type Listener = (event: 'start' | 'progress' | 'end', session: ListenSession) => void;
const listeners = new Set<Listener>();

/** Subscribe to listening sessions (used by scrobbling / presence) */
export function onListening(fn: Listener) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
}

/**
 * Measures how long each song is really listened to: stored on its history row
 * (for stats) and broadcast to scrobblers. Time only accrues from normal playback
 * ticks, so a seek to the end doesn't count as a full listen.
 */
export function useListening() {
    useEffect(() => {
        let session: ListenSession | null = null;
        let lastTime = 0;

        const end = () => {
            if (!session) return;
            const s = session;
            session = null;
            window.ipcRenderer.invoke('history:setListened', { title: s.track.title, artist: s.track.artist, seconds: s.heard }).catch(() => { /* ignore */ });
            listeners.forEach(fn => fn('end', s));
        };

        const start = (track: Track | null) => {
            end();
            lastTime = 0;
            if (!track) return;
            session = { track, startedAt: Math.floor(Date.now() / 1000), heard: 0 };
            listeners.forEach(fn => fn('start', session!));
        };

        start(usePlayerStore.getState().currentTrack);

        const unsub = usePlayerStore.subscribe((s, prev) => {
            if (s.currentTrack !== prev.currentTrack) {
                start(s.currentTrack);
                return;
            }
            if (!session) return;
            if (s.currentTime !== prev.currentTime) {
                const delta = s.currentTime - lastTime;
                lastTime = s.currentTime;
                if (s.isPlaying && delta > 0 && delta < 3) {
                    session.heard += delta;
                    listeners.forEach(fn => fn('progress', session!));
                }
            }
            if (s.isPlaying !== prev.isPlaying) listeners.forEach(fn => fn('progress', session!));
        });

        window.addEventListener('beforeunload', end);
        return () => { unsub(); window.removeEventListener('beforeunload', end); end(); };
    }, []);
}
