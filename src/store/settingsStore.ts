import { create } from 'zustand';

interface SettingsState {
    lastfmKey: string;
    spotifyClientId: string;
    spotifyClientSecret: string;
    youtubeApiKey: string;
    downloadPath: string;
    isScanning: boolean;

    fetchSettings: () => Promise<void>;
    setLastfmKey: (key: string) => Promise<void>;
    setSpotifyKeys: (clientId: string, clientSecret: string) => Promise<void>;
    setYoutubeApiKey: (key: string) => Promise<void>;
    setDownloadPath: (path: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
    lastfmKey: '',
    spotifyClientId: '',
    spotifyClientSecret: '',
    youtubeApiKey: '',
    downloadPath: '',
    isScanning: false,

    fetchSettings: async () => {
        const [lfm, sId, sSec, yt, dlPath] = await Promise.all([
            window.ipcRenderer.invoke('settings:get', 'lastfm_api_key'),
            window.ipcRenderer.invoke('settings:get', 'spotify_client_id'),
            window.ipcRenderer.invoke('settings:get', 'spotify_client_secret'),
            window.ipcRenderer.invoke('settings:get', 'youtube_api_key'),
            window.ipcRenderer.invoke('settings:get', 'download_path'),
        ]);
        set({
            lastfmKey: lfm || '',
            spotifyClientId: sId || '',
            spotifyClientSecret: sSec || '',
            youtubeApiKey: yt || '',
            downloadPath: dlPath || '',
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
}));
