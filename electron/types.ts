/** The parts of yt-dlp's `--dump-json` output the app reads. */
export interface YtDlpThumbnail { url: string; width?: number; height?: number }
export interface YtDlpFormat {
    format_id: string;
    ext: string;
    acodec?: string;
    vcodec?: string;
    abr?: number;
    filesize?: number;
    filesize_approx?: number;
    url?: string;
}
export interface YtDlpSubtitle { ext: string; url: string; name?: string }
export interface YtDlpInfo {
    id: string;
    title?: string;
    uploader?: string;
    channel?: string;
    artist?: string;
    creator?: string;
    duration?: number;
    thumbnail?: string;
    thumbnails?: YtDlpThumbnail[];
    upload_date?: string;
    url?: string;
    ext?: string;
    filesize?: number;
    filesize_approx?: number;
    language?: string;
    formats?: YtDlpFormat[];
    subtitles?: Record<string, YtDlpSubtitle[]>;
    automatic_captions?: Record<string, YtDlpSubtitle[]>;
    /** Present for playlists / searches */
    entries?: YtDlpInfo[];
}
