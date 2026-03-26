import { create } from 'zustand';

interface SettingsState {
    lastfmKey: string;
    spotifyClientId: string;
    spotifyClientSecret: string;
    youtubeApiKey: string;
    downloadPath: string;
    isScanning: boolean;

    albumSortBy: 'name' | 'artist' | 'count';
    albumSortOrder: 'asc' | 'desc';
    albumThumbnailSize: number;
    isMiniPlayerResizable: boolean;

    artistSortBy: 'name' | 'count';
    artistSortOrder: 'asc' | 'desc';

    fetchSettings: () => Promise<void>;
    setLastfmKey: (key: string) => Promise<void>;
    setSpotifyKeys: (clientId: string, clientSecret: string) => Promise<void>;
    setYoutubeApiKey: (key: string) => Promise<void>;
    setDownloadPath: (path: string) => Promise<void>;
    setAlbumSortBy: (by: 'name' | 'artist' | 'count') => Promise<void>;
    setAlbumSortOrder: (order: 'asc' | 'desc') => Promise<void>;
    setAlbumThumbnailSize: (size: number) => Promise<void>;

    setArtistSortBy: (by: 'name' | 'count') => Promise<void>;
    setArtistSortOrder: (order: 'asc' | 'desc') => Promise<void>;
    setMiniPlayerResizable: (resizable: boolean) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
    lastfmKey: '',
    spotifyClientId: '',
    spotifyClientSecret: '',
    youtubeApiKey: '',
    downloadPath: '',
    isScanning: false,
    albumSortBy: 'name',
    albumSortOrder: 'asc',
    albumThumbnailSize: 150,

    artistSortBy: 'name',
    artistSortOrder: 'asc',
    isMiniPlayerResizable: false,

    fetchSettings: async () => {
        const [lfm, sId, sSec, yt, dlPath, sortBy, sortOrder, thumbSize, artistBy, artistOrder, resizable] = await Promise.all([
            window.ipcRenderer.invoke('settings:get', 'lastfm_api_key'),
            window.ipcRenderer.invoke('settings:get', 'spotify_client_id'),
            window.ipcRenderer.invoke('settings:get', 'spotify_client_secret'),
            window.ipcRenderer.invoke('settings:get', 'youtube_api_key'),
            window.ipcRenderer.invoke('settings:get', 'download_path'),
            window.ipcRenderer.invoke('settings:get', 'album_sort_by'),
            window.ipcRenderer.invoke('settings:get', 'album_sort_order'),
            window.ipcRenderer.invoke('settings:get', 'album_thumbnail_size'),
            window.ipcRenderer.invoke('settings:get', 'artist_sort_by'),
            window.ipcRenderer.invoke('settings:get', 'artist_sort_order'),
            window.ipcRenderer.invoke('settings:get', 'miniplayer_resizable')
        ]);
        set({
            lastfmKey: lfm || '',
            spotifyClientId: sId || '',
            spotifyClientSecret: sSec || '',
            youtubeApiKey: yt || '',
            downloadPath: dlPath || '',
            albumSortBy: (sortBy as any) || 'name',
            albumSortOrder: (sortOrder as any) || 'asc',
            albumThumbnailSize: thumbSize ? parseInt(thumbSize) : 150,
            artistSortBy: (artistBy as any) || 'name',
            artistSortOrder: (artistOrder as any) || 'asc',
            isMiniPlayerResizable: resizable === 'true',
        });
    },

    setLastfmKey: async (key: string) => {
        await window.ipcRenderer.invoke('settings:set', { key: 'lastfm_api_key', value: key });
        set({ lastfmKey: key });
    },

    setSpotifyKeys: async (clientId: string, clientSecret: string) => {
        await Promise.all([
            window.ipcRenderer.invoke('settings:set', { key: 'spotify_client_id', value: clientId }),
            window.ipcRenderer.invoke('settings:set', { key: 'spotify_client_secret', value: clientSecret })
        ]);
        set({ spotifyClientId: clientId, spotifyClientSecret: clientSecret });
    },

    setYoutubeApiKey: async (key: string) => {
        await window.ipcRenderer.invoke('settings:set', { key: 'youtube_api_key', value: key });
        set({ youtubeApiKey: key });
    },

    setDownloadPath: async (path: string) => {
        await window.ipcRenderer.invoke('settings:set', { key: 'download_path', value: path });
        set({ downloadPath: path });
    },

    setAlbumSortBy: async (by) => {
        await window.ipcRenderer.invoke('settings:set', { key: 'album_sort_by', value: by });
        set({ albumSortBy: by });
    },

    setAlbumSortOrder: async (order) => {
        await window.ipcRenderer.invoke('settings:set', { key: 'album_sort_order', value: order });
        set({ albumSortOrder: order });
    },

    setAlbumThumbnailSize: async (size) => {
        await window.ipcRenderer.invoke('settings:set', { key: 'album_thumbnail_size', value: size.toString() });
        set({ albumThumbnailSize: size });
    },

    setArtistSortBy: async (by) => {
        await window.ipcRenderer.invoke('settings:set', { key: 'artist_sort_by', value: by });
        set({ artistSortBy: by });
    },

    setArtistSortOrder: async (order) => {
        await window.ipcRenderer.invoke('settings:set', { key: 'artist_sort_order', value: order });
        set({ artistSortOrder: order });
    },

    setMiniPlayerResizable: async (resizable: boolean) => {
        await window.ipcRenderer.invoke('settings:set', { key: 'miniplayer_resizable', value: resizable.toString() });
        set({ isMiniPlayerResizable: resizable });
        // Notify main process immediately
        window.ipcRenderer.invoke('window:setMiniPlayerResizable', resizable);
    },
}));
