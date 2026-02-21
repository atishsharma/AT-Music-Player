/// <reference types="vite/client" />

interface Window {
    ipcRenderer: {
        on(channel: string, listener: (event: any, ...args: any[]) => void): () => void;
        off(channel: string, listener: (event: any, ...args: any[]) => void): void;
        send(channel: string, ...args: any[]): void;
        invoke(channel: string, ...args: any[]): Promise<any>;
        'youtube:search'(query: string): Promise<any[]>;
        'youtube:stream'(videoId: string): Promise<any>;
        'download:start': (videoId: string) => Promise<{ success: boolean; message?: string }>;
        'download:cancel': (videoId: string) => Promise<boolean>;
        'lyrics:get': (metadata: any) => Promise<any>;
        'playlist:create': (data: { name: string; description?: string }) => Promise<any>;
        'playlist:getAll': () => Promise<any[]>;
        'playlist:get': (id: number | string) => Promise<any>;
        'playlist:addTrack': (data: { playlistId: number | string; trackId: number | string }) => Promise<boolean>;
        'playlist:removeTrack': (data: { playlistId: number | string; trackId: number | string }) => Promise<boolean>;
        'playlist:delete': (id: number | string) => Promise<boolean>;
        'metadata:searchArtist': (query: string) => Promise<any[]>;
        'metadata:getArtist': (mbid: string) => Promise<any>;
        'metadata:getAlbum': (mbid: string) => Promise<any>;
        'metadata:syncArtist': (artistName: string) => Promise<{ bio: string; image: string } | null>;
        'metadata:syncAlbum': (data: { artist: string; album: string }) => Promise<{ cover: string; year: number } | null>;
        'settings:get': (key: string) => Promise<string | null>;
        'settings:set': (data: { key: string; value: string }) => Promise<boolean>;
        'shell:showItemInFolder': (path: string) => Promise<void>;
        'shell:trashItem': (path: string) => Promise<boolean>;
        setZoomFactor?: (factor: number) => void;
    };
}
