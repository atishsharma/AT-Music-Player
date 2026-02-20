import { create } from 'zustand';

export interface Playlist {
    id: number;
    name: string;
    description?: string;
    image_path?: string;
    created_at: string;
    tracks?: any[];
}

interface PlaylistState {
    playlists: Playlist[];
    currentPlaylist: Playlist | null;
    isLoading: boolean;

    fetchPlaylists: () => Promise<void>;
    fetchPlaylist: (id: number | string) => Promise<void>;
    createPlaylist: (name: string, description?: string) => Promise<void>;
    deletePlaylist: (id: number | string) => Promise<void>;
    addTrackToPlaylist: (playlistId: number | string, trackId: number | string) => Promise<boolean>;
    removeTrackFromPlaylist: (playlistId: number | string, trackId: number | string) => Promise<void>;
}

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
    playlists: [],
    currentPlaylist: null,
    isLoading: false,

    fetchPlaylists: async () => {
        set({ isLoading: true });
        try {
            const playlists = await window.ipcRenderer.invoke('playlist:getAll');
            set({ playlists, isLoading: false });
        } catch (err) {
            console.error('Failed to fetch playlists:', err);
            set({ isLoading: false });
        }
    },

    fetchPlaylist: async (id) => {
        set({ isLoading: true });
        try {
            const playlist = await window.ipcRenderer.invoke('playlist:get', id);
            set({ currentPlaylist: playlist, isLoading: false });
        } catch (err) {
            console.error('Failed to fetch playlist:', err);
            set({ isLoading: false });
        }
    },

    createPlaylist: async (name, description) => {
        try {
            await window.ipcRenderer.invoke('playlist:create', { name, description });
            await get().fetchPlaylists();
        } catch (err) {
            console.error('Failed to create playlist:', err);
        }
    },

    deletePlaylist: async (id) => {
        try {
            await window.ipcRenderer.invoke('playlist:delete', id);
            await get().fetchPlaylists();
        } catch (err) {
            console.error('Failed to delete playlist:', err);
        }
    },

    addTrackToPlaylist: async (playlistId, trackId) => {
        try {
            const success = await window.ipcRenderer.invoke('playlist:addTrack', { playlistId, trackId });
            // If we are currently viewing this playlist, refresh it
            const current = get().currentPlaylist;
            if (current && current.id == playlistId) {
                await get().fetchPlaylist(playlistId);
            }
            return success;
        } catch (err) {
            console.error('Failed to add track to playlist:', err);
            return false;
        }
    },

    removeTrackFromPlaylist: async (playlistId, trackId) => {
        try {
            await window.ipcRenderer.invoke('playlist:removeTrack', { playlistId, trackId });
            const current = get().currentPlaylist;
            if (current && current.id == playlistId) {
                await get().fetchPlaylist(playlistId);
            }
        } catch (err) {
            console.error('Failed to remove track from playlist:', err);
        }
    }
}));
