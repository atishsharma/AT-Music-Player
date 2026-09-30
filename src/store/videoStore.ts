import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type VideoQuality = '360p' | '480p' | '720p' | '1080p';

interface VideoState {
    quality: VideoQuality;
    /** Preferred subtitle language ('' = off) */
    subtitleLang: string;
    theater: boolean;
    /** The floating video window is open */
    floating: boolean;
    set: (patch: Partial<Omit<VideoState, 'set'>>) => void;
}

export const useVideoStore = create<VideoState>()(
    persist(
        (set) => ({
            quality: '720p',
            subtitleLang: '',
            theater: false,
            floating: false,
            set: (patch) => set(patch),
        }),
        { name: 'at-music-video', partialize: (s) => ({ quality: s.quality, subtitleLang: s.subtitleLang, theater: s.theater }) }
    )
);
