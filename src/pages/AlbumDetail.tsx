import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Disc, Calendar, User, RefreshCw, ImagePlus } from 'lucide-react';
import { motion } from 'framer-motion';
import SongList from '../components/library/SongList';
import { usePlayerStore } from '../store/playerStore';
import { toAtmusicUrl } from '../utils/path';

interface AlbumData {
    id: string;
    title: string;
    date?: string;
    'artist-credit'?: Array<{
        name: string;
        artist: { id: string; name: string };
    }>;
    cover?: string;
    media?: Array<{
        tracks: Array<{
            id: string;
            title: string;
            length: number;
        }>;
    }>;
    local_cover?: string;
}

const AlbumDetail = () => {
    const { id } = useParams(); // Using album title for local lookups
    const navigate = useNavigate();
    const { play, setQueue } = usePlayerStore();

    const [albumData, setAlbumData] = useState<AlbumData | null>(null);
    const [localTracks, setLocalTracks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingPhoto, setIsFetchingPhoto] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const loadData = async () => {
            if (!id) return;

            // 1. Instant Loading: Get Local Tracks by Album Title
            try {
                const tracks = await window.ipcRenderer.invoke('library:getAlbumTracks', id);
                setLocalTracks(tracks);

                // If we have tracks, we can already show the page
                if (tracks.length > 0) {
                    setIsLoading(false);
                }

                // 2. Try Cache for Metadata to make it even faster
                const cached = await window.ipcRenderer.invoke('cache:get', `album_v2_${id}`);
                if (cached) {
                    setAlbumData(cached);
                    setIsLoading(false);
                    // Even if cached, we continue background fetch to update if needed
                }

                // 3. Background Fetch: Metadata
                const artistName = tracks[0]?.artist;

                // MusicBrainz enrichment
                const query = artistName ? `release:${id} AND artist:${artistName}` : `release:${id}`;
                const mbSearchResponse = await fetch(`https://musicbrainz.org/ws/2/release?query=${encodeURIComponent(query)}&fmt=json`, {
                    headers: { 'User-Agent': 'ATMusicPro/1.1.1' }
                });
                const mbSearchData = await mbSearchResponse.json();

                let enrichedData: any = cached || { title: id };

                if (mbSearchData.releases && mbSearchData.releases.length > 0) {
                    const mbid = mbSearchData.releases[0].id;
                    const details = await window.ipcRenderer.invoke('metadata:getAlbum', mbid);
                    enrichedData = { ...enrichedData, ...details };
                }

                // LastFM Sync
                if (artistName && id) {
                    const syncData = await window.ipcRenderer.invoke('metadata:syncAlbum', { artist: artistName, album: id });
                    if (syncData?.cover) {
                        enrichedData = { ...enrichedData, local_cover: syncData.cover };
                    }
                }

                setAlbumData(enrichedData);

                // Cache the enriched data
                window.ipcRenderer.invoke('cache:set', {
                    key: `album_v2_${id}`,
                    data: enrichedData
                });

            } catch (err) {
                console.error("Failed to load album data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [id]);

    const handlePlayAll = () => {
        if (localTracks.length > 0) {
            setQueue(localTracks);
            play(localTracks[0]);
        }
    };

    const handleFetchPhoto = async () => {
        if (!id || localTracks.length === 0) return;
        setIsFetchingPhoto(true);
        setMessage('Searching Last.fm...');
        const artistName = localTracks[0]?.artist;
        try {
            const syncData = await window.ipcRenderer.invoke('metadata:syncAlbum', { artist: artistName, album: id });
            if (syncData?.cover) {
                setAlbumData(prev => prev ? { ...prev, local_cover: syncData.cover } : { title: id, local_cover: syncData.cover } as any);
                setMessage('Cover art updated!');
            } else {
                setMessage('Cover not found or key missing.');
            }
        } catch (err) {
            setMessage('Failed to fetch cover.');
        } finally {
            setIsFetchingPhoto(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleAddPhoto = async () => {
        const imagePath = await window.ipcRenderer.invoke('dialog:openImage');
        const artistName = localTracks[0]?.artist || 'Unknown Artist';
        if (imagePath && id) {
            await window.ipcRenderer.invoke('album:updateImage', { albumName: id, artistName, imagePath });
            setAlbumData(prev => prev ? { ...prev, local_cover: imagePath } : { title: id, local_cover: imagePath } as any);
        }
    };

    if (isLoading && !albumData) {
        return <div className="p-8 flex items-center justify-center h-full">Loading...</div>;
    }

    const displayTitle = albumData?.title || id;
    const displayArtist = albumData?.['artist-credit']?.[0]?.name || localTracks[0]?.artist || 'Unknown Artist';

    return (
        <div className="h-full flex flex-col overflow-y-auto bg-background">
            {/* Header */}
            <div className="relative pb-8">
                <div className="absolute inset-0 bg-gradient-to-b from-primary-900/30 to-background h-80 pointer-events-none" />

                <div className="relative p-8 pt-12 flex flex-col md:flex-row gap-8 items-end">
                    {/* Album Art */}
                    <div className="w-56 h-56 rounded-2xl bg-surface-variant overflow-hidden shadow-2xl border-4 border-on-surface-variant/10 group relative flex-shrink-0">
                        {albumData?.local_cover || albumData?.cover ? (
                            <img src={(albumData?.local_cover || albumData?.cover || '').startsWith('http') ? (albumData.local_cover || albumData.cover) : toAtmusicUrl(albumData.local_cover || albumData.cover)} alt={displayTitle} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary">
                                <Disc size={80} />
                            </div>
                        )}
                        <button onClick={handleAddPhoto} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                            <ImagePlus className="text-on-background" size={32} />
                        </button>
                    </div>

                    <div className="flex-1 space-y-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 text-on-surface-variant hover:text-on-background transition-colors mb-2"
                        >
                            <ArrowLeft size={20} /> Back
                        </button>

                        <div className="space-y-1">
                            <span className="text-primary font-medium tracking-wider text-sm uppercase">Album</span>
                            <h1 className="text-5xl md:text-6xl font-bold text-on-background tracking-tight">{displayTitle}</h1>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-on-surface-variant">
                            <div className="flex items-center gap-2 hover:text-on-background cursor-pointer transition-colors px-3 py-1 bg-surface-variant/20 rounded-full"
                                onClick={() => navigate(`/artist/${encodeURIComponent(displayArtist)}`)}>
                                <User size={18} className="text-primary" />
                                <span className="font-medium">{displayArtist}</span>
                            </div>

                            {albumData?.date && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-surface-variant/20 rounded-full">
                                    <Calendar size={18} />
                                    <span>{new Date(albumData.date).getFullYear()}</span>
                                </div>
                            )}

                            <div className="flex items-center gap-2 px-3 py-1 bg-surface-variant/20 rounded-full">
                                <Disc size={18} />
                                <span>{localTracks.length} songs</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-4">
                            <button
                                onClick={handlePlayAll}
                                disabled={localTracks.length === 0}
                                className="px-10 py-4 bg-primary hover:bg-primary/90 rounded-full text-on-primary font-bold flex items-center gap-2 shadow-xl shadow-primary/30 transition-all hover:scale-105 active:scale-95"
                            >
                                <Play size={24} fill="currentColor" /> Play Album
                            </button>

                            <button
                                onClick={handleFetchPhoto}
                                disabled={isFetchingPhoto}
                                className="px-8 py-4 bg-primary hover:bg-primary/90 text-on-primary rounded-full font-bold flex items-center gap-2 shadow-xl shadow-primary/30 transition-all hover:scale-105 disabled:opacity-50"
                            >
                                <RefreshCw size={20} className={isFetchingPhoto ? "animate-spin" : ""} />
                                {isFetchingPhoto ? "Fetching..." : "Fetch Photo"}
                            </button>

                            {message && (
                                <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-xs font-bold text-primary self-center"
                                >
                                    {message}
                                </motion.span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-8">
                {localTracks.length > 0 ? (
                    <SongList
                        tracks={localTracks}
                        onPlay={(track) => {
                            setQueue(localTracks);
                            play(track);
                        }}
                    />
                ) : (
                    <div className="p-20 text-center text-on-surface-variant bg-surface-variant/20 rounded-3xl border border-white/5">
                        <Disc size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-xl font-medium">No songs from this album in your library.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AlbumDetail;
