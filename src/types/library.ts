export interface Track {
    id: number | string;
    title: string;
    artist: string;
    album: string;
    duration: number;
    path: string;
    format: string;
    image_path?: string;
    thumbnail?: string; // For online tracks
    source?: 'local' | 'youtube' | 'spotify' | 'ytmusic';
    video_id?: string;
    liked?: boolean;
    date?: string;
    hasLyrics?: number | boolean;
}

export interface Album {
    id: number;
    title: string;
    artist: string;
    artwork?: string;
    year?: number;
}

export interface Artist {
    id: number;
    name: string;
    image?: string;
}

/** One timed lyric line (from LRC) */
export interface LyricLine {
    seconds: number;
    content: string;
}

export interface Lyrics {
    plainLyrics: string;
    syncedLyrics: LyricLine[];
    isSynced: boolean;
}

export interface PlaylistSummary {
    id: number;
    name: string;
    description?: string;
    image_path?: string;
    created_at?: string;
}
