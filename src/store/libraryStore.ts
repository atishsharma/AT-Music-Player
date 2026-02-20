import { create } from 'zustand';
import { Track } from '../types/library';

interface LibraryState {
    tracks: Track[];
    isLoading: boolean;
    scanProgress: { total: number; processed: number } | null;
    setTracks: (tracks: Track[]) => void;
    setLoading: (loading: boolean) => void;
    setScanProgress: (progress: { total: number; processed: number } | null) => void;
    refreshLibrary: () => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set) => ({
    tracks: [],
    isLoading: false,
    scanProgress: null,
    setTracks: (tracks) => set({ tracks }),
    setLoading: (isLoading) => set({ isLoading }),
    setScanProgress: (scanProgress) => set({ scanProgress }),
    refreshLibrary: async () => {
        set({ isLoading: true });
        try {
            const tracks = await window.ipcRenderer.invoke('library:getTracks');
            set({ tracks });
        } catch (error) {
            console.error('Failed to refresh library:', error);
        } finally {
            set({ isLoading: false });
        }
    },
}));
