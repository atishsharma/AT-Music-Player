import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { usePlayerStore } from './playerStore';
import type { Track } from '../types/library';

interface RadioState {
    /** A radio station is running (started from a song) */
    active: boolean;
    seedTitle: string;
    loading: boolean;
    /** Keep playing similar songs whenever the queue runs out, even without a station */
    autoplay: boolean;
    start: (track?: Track | null) => Promise<void>;
    stop: () => void;
    setAutoplay: (on: boolean) => void;
    topUp: () => Promise<void>;
}

const isYouTube = (t: Track) => t.source === 'youtube' || t.source === 'ytmusic';

/** Seed for the main process: a YouTube id when we have one, else title/artist to look up. */
function seedOf(t: Track) {
    const videoId = isYouTube(t) ? String(t.id) : t.video_id || undefined;
    return { videoId, title: t.title, artist: t.artist, trackId: typeof t.id === 'number' ? t.id : undefined };
}

async function fetchMix(seed: Track, exclude: Set<string>): Promise<Track[]> {
    const items: any[] = await window.ipcRenderer.invoke('radio:getMix', seedOf(seed));
    return (items || [])
        .filter(i => !exclude.has(String(i.id)))
        .map(i => ({ ...i, album: '', path: '', format: '' } as Track));
}

const recentIds = () => {
    const p = usePlayerStore.getState();
    const ids = new Set<string>();
    [...p.history.slice(-50), ...p.queue, p.currentTrack].forEach(t => {
        if (!t) return;
        ids.add(String(t.id));
        if (t.video_id) ids.add(t.video_id);
    });
    return ids;
};

export const useRadioStore = create<RadioState>()(
    persist(
        (set, get) => ({
            active: false,
            seedTitle: '',
            loading: false,
            autoplay: true,

            start: async (track) => {
                const player = usePlayerStore.getState();
                const seed = track ?? player.currentTrack;
                if (!seed || get().loading) return;
                set({ loading: true, active: true, seedTitle: seed.title });
                try {
                    const mix = await fetchMix(seed, new Set([String(seed.id), seed.video_id ?? '']));
                    if (seed !== usePlayerStore.getState().currentTrack) usePlayerStore.getState().play(seed);
                    // A station replaces the queue with the mix
                    usePlayerStore.getState().setQueue(mix);
                } finally {
                    set({ loading: false });
                }
            },

            stop: () => set({ active: false, seedTitle: '' }),
            setAutoplay: (on) => set({ autoplay: on }),

            // Called when the queue is nearly empty
            topUp: async () => {
                const { active, autoplay, loading } = get();
                const current = usePlayerStore.getState().currentTrack;
                if ((!active && !autoplay) || loading || !current) return;
                set({ loading: true });
                try {
                    const more = await fetchMix(current, recentIds());
                    if (more.length) {
                        const p = usePlayerStore.getState();
                        p.setQueue([...p.queue, ...more.slice(0, 15)]);
                    }
                } finally {
                    set({ loading: false });
                }
            },
        }),
        { name: 'at-music-radio', partialize: (s) => ({ autoplay: s.autoplay }) }
    )
);
