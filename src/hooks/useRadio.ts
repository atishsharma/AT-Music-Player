import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { useRadioStore } from '../store/radioStore';

/**
 * Keeps the queue topped up with similar songs (Smart Radio / autoplay): when music is
 * playing and two or fewer songs are left, the mix for the current song is appended.
 * Each song is used as a seed at most once, so an empty result doesn't retry in a loop.
 */
export function useRadioTopUp() {
    useEffect(() => {
        const tried = new Set<string>();
        let timer: number | undefined;
        const check = () => {
            const p = usePlayerStore.getState();
            const r = useRadioStore.getState();
            if (!p.isPlaying || !p.currentTrack || p.queue.length > 2 || (!r.active && !r.autoplay)) return;
            const key = String(p.currentTrack.id);
            if (tried.has(key)) return;
            tried.add(key);
            r.topUp();
        };
        const unsub = usePlayerStore.subscribe((s, prev) => {
            if (s.queue !== prev.queue || s.currentTrack !== prev.currentTrack || s.isPlaying !== prev.isPlaying) {
                window.clearTimeout(timer);
                // Small delay: let the user finish queueing things before we add to it
                timer = window.setTimeout(check, 4000);
            }
        });
        return () => { unsub(); window.clearTimeout(timer); };
    }, []);
}
