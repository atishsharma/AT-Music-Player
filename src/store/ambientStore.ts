import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AmbientScene = 'aurora' | 'vinyl' | 'horizon' | 'clock';
export type AmbientLyricStyle = 'karaoke' | 'scroll' | 'focus';
export type SleepTimer = 0 | 15 | 30 | 60 | 'end';

export const AMBIENT_SCENES: AmbientScene[] = ['aurora', 'vinyl', 'horizon', 'clock'];
export const AMBIENT_STYLES: AmbientLyricStyle[] = ['karaoke', 'scroll', 'focus'];

interface AmbientState {
    isOpen: boolean;
    /** Opened by the idle timer (screensaver) rather than by the user */
    openedByIdle: boolean;

    scene: AmbientScene;
    lyricStyle: AmbientLyricStyle;
    lyricScale: number;
    /** Seconds added to playback time when matching lyric lines */
    lyricOffset: number;
    dim: number;
    showClock: boolean;
    burnInShift: boolean;
    lowPower: boolean;
    fullScreen: boolean;
    keepAwake: boolean;
    /** Minutes of system inactivity before ambient mode opens while music plays (0 = never) */
    idleMinutes: number;

    sleep: SleepTimer;
    /** Epoch ms when the sleep timer pauses playback (0 = not running) */
    sleepAt: number;

    open: (byIdle?: boolean) => void;
    close: () => void;
    set: (patch: Partial<Omit<AmbientState, 'open' | 'close' | 'set' | 'setSleep'>>) => void;
    setSleep: (sleep: SleepTimer) => void;
}

export const useAmbientStore = create<AmbientState>()(
    persist(
        (set) => ({
            isOpen: false,
            openedByIdle: false,

            scene: 'aurora',
            lyricStyle: 'karaoke',
            lyricScale: 1,
            lyricOffset: 0,
            dim: 0,
            showClock: true,
            burnInShift: true,
            lowPower: false,
            fullScreen: true,
            keepAwake: true,
            idleMinutes: 5,

            sleep: 0,
            sleepAt: 0,

            open: (byIdle = false) => set({ isOpen: true, openedByIdle: byIdle }),
            close: () => set({ isOpen: false, openedByIdle: false }),
            set: (patch) => set(patch),
            setSleep: (sleep) => set({
                sleep,
                sleepAt: typeof sleep === 'number' && sleep > 0 ? Date.now() + sleep * 60_000 : 0,
            }),
        }),
        {
            name: 'at-music-ambient',
            // Session state (open, sleep timer) is not persisted
            partialize: (s) => ({
                scene: s.scene, lyricStyle: s.lyricStyle, lyricScale: s.lyricScale, lyricOffset: s.lyricOffset,
                dim: s.dim, showClock: s.showClock, burnInShift: s.burnInShift, lowPower: s.lowPower,
                fullScreen: s.fullScreen, keepAwake: s.keepAwake, idleMinutes: s.idleMinutes,
            }),
        }
    )
);
