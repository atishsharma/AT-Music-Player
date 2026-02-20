import { create } from 'zustand';
import { Track } from '../types/library';

interface PlayerState {
    isPlaying: boolean;
    currentTrack: Track | null;
    queue: Track[]; // Used for sequential playback
    history: Track[]; // Used for previous button
    volume: number;
    currentTime: number;
    duration: number;
    loop: 'none' | 'one' | 'all';
    shuffle: boolean;
    isPlayerOpen: boolean;
    isSidebarQueueOpen: boolean;
    isSidebarLyricsOpen: boolean;
    lyrics: { plainLyrics: string; syncedLyrics: any[]; isSynced: boolean } | null;
    isMuted: boolean;
    previousVolume: number;
    loadingLyrics: boolean;

    // Actions
    play: (track?: Track) => void;
    pause: () => void;
    next: () => void;
    prev: () => void;
    setVolume: (volume: number) => void;
    setCurrentTime: (time: number) => void;
    setDuration: (duration: number) => void;
    toggleLoop: () => void;
    toggleShuffle: () => void;
    togglePlayer: () => void;
    setQueue: (tracks: Track[]) => void;
    addToQueue: (track: Track) => void;
    seek: (time: number) => void;
    lastSeekTime: number; // For triggering audio element sync
    toggleSidebarQueue: (open?: boolean) => void;
    toggleSidebarLyrics: (open?: boolean) => void;
    toggleMute: () => void;
    setLyrics: (lyrics: any) => void;
    setLoadingLyrics: (loading: boolean) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
    isPlaying: false,
    currentTrack: null,
    queue: [],
    history: [],
    volume: 1.0,
    currentTime: 0,
    duration: 0,
    isPlayerOpen: false,
    isSidebarQueueOpen: false,
    isSidebarLyricsOpen: false,
    lyrics: null,
    loadingLyrics: false,
    loop: 'none',
    shuffle: false,
    isMuted: false,
    previousVolume: 1.0,
    lastSeekTime: -1,

    play: (track) => {
        if (track) {
            const state = get();
            if (state.currentTrack?.id === track.id) {
                set({ isPlaying: true });
            } else {
                // Playing a new track. 
                // If it's not in queue, what happens? 
                // For now, simpler logic: just play it.
                set((state) => ({
                    currentTrack: track,
                    isPlaying: true,
                    history: state.currentTrack ? [...state.history, state.currentTrack] : state.history
                }));
            }
        } else {
            set({ isPlaying: true });
        }
    },

    pause: () => set({ isPlaying: false }),

    next: () => {
        const { queue, currentTrack, history } = get();
        if (queue.length === 0) return;

        let nextTrack: Track | null = null;
        const nextQueue = [...queue];

        // If queue has items
        // Logic depends on where we are in queue.
        // For simplicity: queue acts as "Up Next".

        // Better logic: Queue is the current playlist context.
        // We need an index.

        // Let's implement a simple "Up Next" queue for now.
        // pop from queue? Or just iterate?
        // Let's pop for now.

        if (nextQueue.length > 0) {
            nextTrack = nextQueue.shift() || null;
            set({
                currentTrack: nextTrack,
                queue: nextQueue,
                history: currentTrack ? [...history, currentTrack] : history,
                isPlaying: true
            });
        } else {
            // Queue empty.
            set({ isPlaying: false });
        }
    },

    prev: () => {
        const { history } = get();
        if (history.length > 0) {
            const prevTrack = history[history.length - 1];
            const newHistory = history.slice(0, -1);
            set({
                currentTrack: prevTrack,
                history: newHistory,
                isPlaying: true
            });
        }
    },

    setVolume: (volume) => set({ volume, isMuted: volume === 0 }),

    toggleMute: () => {
        const { volume, isMuted, previousVolume } = get();
        if (isMuted) {
            set({ volume: previousVolume, isMuted: false });
        } else {
            set({ previousVolume: volume, volume: 0, isMuted: true });
        }
    },

    setCurrentTime: (time) => set({ currentTime: time }),

    setDuration: (duration) => set({ duration }),

    toggleLoop: () => set((state) => ({
        loop: state.loop === 'none' ? 'all' : state.loop === 'all' ? 'one' : 'none'
    })),

    toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),

    togglePlayer: () => set((state) => ({ isPlayerOpen: !state.isPlayerOpen })),

    setQueue: (tracks) => set({ queue: tracks }),

    addToQueue: (track) => set((state) => ({ queue: [...state.queue, track] })),
    seek: (time) => set({ currentTime: time, lastSeekTime: Date.now() }),

    toggleSidebarQueue: (open) => set((state) => ({
        isSidebarQueueOpen: open !== undefined ? open : !state.isSidebarQueueOpen,
        isSidebarLyricsOpen: false // Close lyrics if queue opens
    })),
    toggleSidebarLyrics: (open) => set((state) => ({
        isSidebarLyricsOpen: open !== undefined ? open : !state.isSidebarLyricsOpen,
        isSidebarQueueOpen: false // Close queue if lyrics opens
    })),
    setLyrics: (lyrics) => set({ lyrics }),
    setLoadingLyrics: (loading) => set({ loadingLyrics: loading }),
}));
