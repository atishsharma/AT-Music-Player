import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AudioState {
    /** Crossfade length in seconds (0 = off) */
    crossfade: number;
    /** Start the next song the moment the current one ends (no gap) */
    gapless: boolean;
    /** Even out loudness between songs */
    normalize: boolean;
    /** Sing-along vocal reduction, 0..1 (0 = off) */
    vocalReduction: number;
    set: (patch: Partial<Omit<AudioState, 'set'>>) => void;
}

export const useAudioStore = create<AudioState>()(
    persist(
        (set) => ({
            crossfade: 0,
            gapless: true,
            normalize: false,
            vocalReduction: 0,
            set: (patch) => set(patch),
        }),
        { name: 'at-music-audio', partialize: (s) => ({ crossfade: s.crossfade, gapless: s.gapless, normalize: s.normalize }) }
    )
);
