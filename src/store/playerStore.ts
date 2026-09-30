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
    next: (auto?: boolean) => void;
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
    removeFromQueue: (index: number) => void;
    reorderQueue: (newQueue: Track[]) => void;
    clearQueue: () => void;
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
                // The previous track goes to history (for the Previous button). It used to also be
                // unshifted to the FRONT of the queue, so pressing Next right after picking a song
                // jumped straight back to the song that was playing before.
                // Play history is written to the DB by <Player /> on track change (was written twice).
                set({
                    currentTrack: track,
                    isPlaying: true,
                    currentTime: 0,
                    history: state.currentTrack ? [...state.history, state.currentTrack].slice(-200) : state.history
                });
            }
        } else if (get().currentTrack) {
            set({ isPlaying: true });
        }
    },

    pause: () => set({ isPlaying: false }),

    next: (auto = false) => {
        const { queue, currentTrack, history, loop } = get();
        if (queue.length === 0 && !currentTrack) return;

        if (queue.length > 0) {
            const nextQueue = [...queue];
            const nextTrack = nextQueue.shift() || null;
            // Only recycle played tracks to the end of the queue when repeat-all is on
            if (currentTrack && loop === 'all') {
                nextQueue.push(currentTrack);
            }
            set({
                currentTrack: nextTrack,
                queue: nextQueue,
                history: currentTrack ? [...history, currentTrack].slice(-200) : history,
                isPlaying: true,
                currentTime: 0
            });
        } else if (currentTrack) {
            if (auto && loop === 'none') {
                // End of queue: stop instead of claiming to play an ended track
                set({ isPlaying: false, currentTime: 0, lastSeekTime: Date.now() });
            } else {
                // Replay the only track (seek triggers <Player /> to restart the ended element)
                set({ isPlaying: true, currentTime: 0, lastSeekTime: Date.now() });
            }
        }
    },

    prev: () => {
        const { history, currentTrack, queue, currentTime } = get();
        // Standard player behaviour: restart the current song if it has played for a bit
        if (currentTrack && (currentTime > 3 || history.length === 0)) {
            set({ currentTime: 0, lastSeekTime: Date.now() });
            return;
        }
        if (history.length > 0) {
            const prevTrack = history[history.length - 1];
            set({
                currentTrack: prevTrack,
                history: history.slice(0, -1),
                // Keep the current track: it becomes "up next" instead of being lost
                queue: currentTrack ? [currentTrack, ...queue] : queue,
                isPlaying: true,
                currentTime: 0
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

    toggleShuffle: () => set((state) => {
        const willShuffle = !state.shuffle;
        const newQueue = [...state.queue];
        if (willShuffle && newQueue.length > 0) {
            // Fisher-Yates shuffle
            for (let i = newQueue.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newQueue[i], newQueue[j]] = [newQueue[j], newQueue[i]];
            }
        }
        return { shuffle: willShuffle, queue: newQueue };
    }),

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
    removeFromQueue: (index) => set((state) => ({
        queue: state.queue.filter((_, i) => i !== index)
    })),
    reorderQueue: (newQueue) => set({ queue: newQueue }),
    clearQueue: () => set({ queue: [] }),
}));
