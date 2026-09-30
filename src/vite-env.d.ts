/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface WindowState {
    isMaximized: boolean;
    isFullScreen: boolean;
    isMiniPlayer: boolean;
}

interface Window {
    /**
     * Generic IPC bridge from the preload script. Payloads cross the process boundary as
     * structured-clone data whose shape depends on the channel, so results are untyped here
     * and narrowed at each call site.
     */
    ipcRenderer: {
        /* eslint-disable @typescript-eslint/no-explicit-any -- IPC payloads are channel-specific */
        on(channel: string, listener: (event: unknown, ...args: any[]) => void): () => void;
        off(channel: string, listener: (event: unknown, ...args: any[]) => void): void;
        send(channel: string, ...args: unknown[]): void;
        invoke(channel: string, ...args: unknown[]): Promise<any>;
        /* eslint-enable @typescript-eslint/no-explicit-any */
        setZoomFactor?: (factor: number) => void;
    };
    windowControls: {
        minimize(): Promise<void>;
        maximize(): Promise<void>;
        close(): Promise<void>;
        isMaximized(): Promise<boolean>;
        toggleFullScreen(): Promise<boolean>;
        toggleAlwaysOnTop(alwaysOnTop: boolean): Promise<void>;
        miniPlayer(): Promise<void>;
        normalMode(): Promise<void>;
        isMiniPlayer(): Promise<boolean>;
        getState(): Promise<WindowState>;
        platform: string;
    };
    yt: {
        getVideoStream(videoId: string): Promise<string>;
        getVideoStreamWithQuality(videoId: string, quality: string): Promise<string>;
        stopVideoStream(): Promise<void>;
    };
    ytdlp: { check(): Promise<boolean> };

    /** Set by <Toast /> once mounted */
    showToast?: (text: string) => void;
    /** Set by the library page so other views can ask it to reload */
    refreshLibraryStore?: () => Promise<void> | void;
    refreshLibraryFromList?: () => Promise<void> | void;
    /** Shared analyser for visualisers, created by the audio engine */
    _audioAnalyser?: AnalyserNode;
    webkitAudioContext?: typeof AudioContext;
    Spotify?: { Player: new (options: Record<string, unknown>) => SpotifyPlayer };
    onSpotifyWebPlaybackSDKReady?: () => void;
}

interface SpotifyPlayer {
    addListener(event: string, cb: (data: { device_id: string }) => void): void;
    connect(): Promise<boolean>;
}
