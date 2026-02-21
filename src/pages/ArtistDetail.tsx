import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Disc, ExternalLink, RefreshCw, ImagePlus, Sparkles, X, Info, Users, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SongList from '../components/library/SongList';
import { usePlayerStore } from '../store/playerStore';
import clsx from 'clsx';
import { toAtmusicUrl } from '../utils/path';

interface ArtistData {
    id: string;
    name: string;
    type: string;
    country: string;
    'life-span'?: {
        begin: string;
        end: string;
    };
    relations?: Array<{
        type: string;
        url: { resource: string };
    }>;
    bio?: string;
    local_image?: string;
}

const ArtistDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { play, setQueue } = usePlayerStore();

    const [artistData, setArtistData] = useState<ArtistData | null>(null);
    const [localTracks, setLocalTracks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingPhoto, setIsFetchingPhoto] = useState(false);
    const [message, setMessage] = useState('');
    const [bioExpanded, setBioExpanded] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            if (!id) return;

            // 1. Instant Loading: Get Local Tracks
            try {
                const tracks = await window.ipcRenderer.invoke('library:getArtistTracks', id);
                setLocalTracks(tracks);
                if (tracks.length > 0) setIsLoading(false);

                // 2. Try Cache
                const cached = await window.ipcRenderer.invoke('cache:get', `artist_v2_${id}`);
                if (cached) {
                    setArtistData(cached);
                    setIsLoading(false);
                }

                // 3. Background Fetch Metadata
                const localArtist = await window.ipcRenderer.invoke('library:getArtist', id);
                let enrichedData: any = cached || { name: id };

                if (localArtist) {
                    enrichedData = {
                        ...enrichedData,
                        name: localArtist.name,
                        bio: localArtist.bio || enrichedData.bio,
                        local_image: localArtist.image_path || enrichedData.local_image
                    };
                }

                // MusicBrainz logic
                const searchResults = await window.ipcRenderer.invoke('metadata:searchArtist', id);
                if (searchResults && searchResults.length > 0) {
                    const mbid = searchResults[0].id;
                    const details = await window.ipcRenderer.invoke('metadata:getArtist', mbid);
                    enrichedData = { ...enrichedData, ...details };
                }

                // LastFM Sync
                const syncData = await window.ipcRenderer.invoke('metadata:syncArtist', id);
                if (syncData) {
                    enrichedData = {
                        ...enrichedData,
                        bio: syncData.bio || enrichedData.bio,
                        local_image: syncData.image || enrichedData.local_image
                    };
                }

                setArtistData(enrichedData);

                // Cache it
                window.ipcRenderer.invoke('cache:set', {
                    key: `artist_v2_${id}`,
                    data: enrichedData
                });

            } catch (err) {
                console.error("Failed to load artist data:", err);
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
        if (!id) return;
        setIsFetchingPhoto(true);
        setMessage('Fetching from Last.fm...');
        try {
            const syncData = await window.ipcRenderer.invoke('metadata:syncArtist', id);
            if (syncData?.image) {
                setArtistData(prev => prev ? { ...prev, local_image: syncData.image } as any : null);
                setMessage('Photo updated successfully!');
            } else {
                setMessage('No photo found or Last.fm key not set.');
            }
        } catch (err) {
            setMessage('Failed to fetch photo.');
        } finally {
            setIsFetchingPhoto(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleAddPhoto = async () => {
        const imagePath = await window.ipcRenderer.invoke('dialog:openImage');
        if (imagePath && (artistData?.name || id)) {
            await window.ipcRenderer.invoke('artist:updateImage', { artistName: artistData?.name || id, imagePath });
            setArtistData(prev => prev ? { ...prev, local_image: imagePath } as any : null);
        }
    };

    const [showMoreInfo, setShowMoreInfo] = useState(false);
    const [lastfmData, setLastfmData] = useState<any>(null);
    const [isFetchingInfo, setIsFetchingInfo] = useState(false);

    const handleMoreInfo = async () => {
        if (!displayName) return;
        setShowMoreInfo(true);
        if (lastfmData) return;

        setIsFetchingInfo(true);
        try {
            const data = await window.ipcRenderer.invoke('metadata:getArtistInfo', displayName);
            if (data) {
                setLastfmData(data);
                // Also update local bio if empty
                if (!artistData?.bio) {
                    await window.ipcRenderer.invoke('library:updateArtistBio', { name: displayName, bio: data.bio?.content || data.bio?.summary });
                }
            }
        } catch (err) {
            console.error('Failed to fetch Last.fm info:', err);
        } finally {
            setIsFetchingInfo(false);
        }
    };

    if (isLoading && !artistData) {
        return <div className="p-8 flex items-center justify-center h-full">Loading...</div>;
    }

    // Fallback if no local tracks found, but maybe we found MB data?
    // Or if we found tracks but no MB data.
    const displayName = artistData?.name || id;

    return (
        <div className="h-full flex flex-col overflow-y-auto bg-background">
            {/* Header */}
            <div className="relative pb-8">
                {/* Background visual - maybe a blurred version of cover art if we had one, or gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-primary-900/30 to-background h-64 pointer-events-none" />

                <div className="relative p-8 pt-12 flex flex-col md:flex-row gap-8 items-start">
                    {/* Placeholder for Artist Image */}
                    <div className="w-48 h-48 rounded-full bg-surface-variant flex items-center justify-center shadow-2xl border-4 border-white/5 overflow-hidden group relative flex-shrink-0">
                        {artistData?.local_image ? (
                            <img src={artistData.local_image.startsWith('http') ? artistData.local_image : toAtmusicUrl(artistData.local_image)} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-4xl font-bold text-white/20">
                                {displayName?.[0]?.toUpperCase()}
                            </span>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer" onClick={handleAddPhoto}>
                            <ImagePlus className="text-white" size={32} />
                        </div>
                    </div >

                    <div className="flex-1 space-y-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 text-on-surface-variant hover:text-on-background transition-colors mb-2"
                        >
                            <ArrowLeft size={20} /> Back
                        </button>

                        <div className="flex items-center gap-3">
                            <h1 className="text-5xl md:text-7xl font-bold text-on-background tracking-tight">{displayName}</h1>
                            {artistData?.country && (
                                <span className="px-2 py-1 bg-surface-variant/20 rounded text-xs text-on-surface-variant">{artistData.country}</span>
                            )}
                        </div>

                        {artistData && (
                            <div className="text-on-surface-variant max-w-3xl">
                                <div className="flex gap-4 mb-4 text-xs font-black uppercase tracking-widest opacity-60">
                                    {artistData.type && <span className="px-2 py-1 bg-white/5 rounded-md">{artistData.type}</span>}
                                    {artistData.country && <span className="px-2 py-1 bg-white/5 rounded-md">{artistData.country}</span>}
                                    {artistData['life-span'] && (
                                        <span className="px-2 py-1 bg-white/5 rounded-md">
                                            {new Date(artistData['life-span'].begin).getFullYear()} - {artistData['life-span'].end ? new Date(artistData['life-span'].end).getFullYear() : 'Present'}
                                        </span>
                                    )}
                                </div>

                                {artistData.bio && (
                                    <div className="relative group">
                                        <p className={clsx(
                                            "text-sm font-medium leading-relaxed bg-surface-variant/5 p-6 rounded-[2rem] border border-white/5 text-on-surface-variant/80 transition-all duration-500",
                                            !bioExpanded && "line-clamp-3"
                                        )}>
                                            {artistData.bio.replace(/<[^>]*>?/gm, '')}
                                        </p>
                                        <button
                                            onClick={() => setBioExpanded(!bioExpanded)}
                                            className="absolute -bottom-3 right-8 px-4 py-1.5 bg-primary text-on-primary text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg hover:scale-105 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            {bioExpanded ? 'Read Less' : 'Read More'}
                                        </button>
                                    </div>
                                )}

                                {/* Group Members */}
                                {artistData.relations?.some((r: any) => r.type === 'member of' || r.type === 'is member of' || r['target-type'] === 'artist' && r.type.includes('member')) && (
                                    <div className="mt-8 flex flex-col gap-3">
                                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Group Members</span>
                                        <div className="flex flex-wrap gap-2">
                                            {artistData.relations
                                                .filter((r: any) => r['target-type'] === 'artist' && (r.type.includes('member') || r.type.includes('instrumental')))
                                                .map((rel: any, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => navigate(`/artist/${encodeURIComponent(rel.artist?.name || rel.name)}`)}
                                                        className="group/member flex items-center gap-2 px-4 py-2 bg-surface-variant/10 hover:bg-primary rounded-xl transition-all border border-white/5"
                                                    >
                                                        <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold group-hover/member:bg-on-primary/20">
                                                            {(rel.artist?.name || rel.name)?.[0]}
                                                        </div>
                                                        <span className="text-sm font-bold group-hover/member:text-on-primary">
                                                            {rel.artist?.name || rel.name}
                                                        </span>
                                                        {rel.attributes?.length > 0 && (
                                                            <span className="text-[10px] opacity-40 group-hover/member:opacity-60 text-on-surface-variant font-medium">
                                                                ({rel.attributes.join(', ')})
                                                            </span>
                                                        )}
                                                    </button>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex flex-wrap gap-4 pt-4">
                            <button
                                onClick={handlePlayAll}
                                disabled={localTracks.length === 0}
                                className="px-8 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-on-primary font-medium flex items-center gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105"
                            >
                                <Play size={20} fill="currentColor" /> Play Local tracks
                            </button>

                            <button
                                onClick={handleMoreInfo}
                                className="px-8 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-full text-white font-medium flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all hover:scale-105"
                            >
                                <Sparkles size={18} /> More Info
                            </button>

                            <button
                                onClick={handleFetchPhoto}
                                disabled={isFetchingPhoto}
                                className="w-12 h-12 bg-primary/10 hover:bg-primary text-primary hover:text-on-primary rounded-full font-medium flex items-center justify-center shadow-lg transition-all disabled:opacity-50 shrink-0"
                                title="Fetch Photo from Last.fm"
                            >
                                <RefreshCw size={20} className={isFetchingPhoto ? "animate-spin" : ""} />
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



                            {/* External Links */}
                            {artistData?.relations?.map((rel, idx) => (
                                rel.type === 'official homepage' && (
                                    <a
                                        key={idx}
                                        href={rel.url.resource}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-3 bg-surface-variant/10 hover:bg-surface-variant/20 rounded-full text-on-surface transition-colors flex items-center gap-2 border border-on-surface-variant/10"
                                    >
                                        <ExternalLink size={18} /> Website
                                    </a>
                                )
                            ))}
                        </div>
                    </div>
                </div >
            </div >

            {/* Content */}
            < div className="p-8" >
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Disc className="text-primary-500" />
                    Local Library
                </h2>

                {
                    localTracks.length > 0 ? (
                        <SongList
                            tracks={localTracks}
                            onPlay={(track) => {
                                setQueue(localTracks);
                                play(track);
                            }}
                        />
                    ) : (
                        <div className="p-8 text-center text-on-surface-variant bg-surface-variant/30 rounded-xl">
                            <p>No tracks found in local library for this artist.</p>
                        </div>
                    )
                }
            </div >

            {/* More Info Popup */}
            <AnimatePresence>
                {showMoreInfo && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowMoreInfo(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-4xl max-h-[85vh] bg-surface-variant overflow-y-auto no-scrollbar rounded-[3rem] shadow-2xl border border-white/10"
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => setShowMoreInfo(false)}
                                className="absolute top-8 right-8 p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all z-10"
                            >
                                <X size={24} />
                            </button>

                            {isFetchingInfo ? (
                                <div className="p-20 flex flex-col items-center justify-center space-y-4">
                                    <RefreshCw className="text-primary animate-spin" size={48} />
                                    <p className="text-xl font-black italic text-primary animate-pulse tracking-widest uppercase">Fetching Global Data...</p>
                                </div>
                            ) : lastfmData ? (
                                <div className="p-12 space-y-12">
                                    {/* Header Section */}
                                    <div className="flex flex-col md:flex-row gap-10 items-center">
                                        <div className="w-64 h-64 rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white/10 flex-shrink-0">
                                            <img
                                                src={lastfmData.image?.find((i: any) => i.size === 'extralarge')?.['#text'] || artistData?.local_image}
                                                className="w-full h-full object-cover"
                                                alt={displayName}
                                            />
                                        </div>
                                        <div className="space-y-6 text-center md:text-left">
                                            <div>
                                                <h2 className="text-6xl font-black text-white tracking-tighter leading-none mb-2">{displayName}</h2>
                                                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                                                    {lastfmData.tags?.tag?.map((tag: any, i: number) => (
                                                        <span key={i} className="px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-black text-primary uppercase tracking-widest overflow-hidden relative">
                                                            <span className="relative z-10">{tag.name}</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-md">
                                                    <div className="flex items-center gap-2 text-white/40 mb-1">
                                                        <TrendingUp size={14} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Listeners</span>
                                                    </div>
                                                    <p className="text-2xl font-black text-white">{parseInt(lastfmData.stats?.listeners || '0').toLocaleString()}</p>
                                                </div>
                                                <div className="p-4 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-md">
                                                    <div className="flex items-center gap-2 text-white/40 mb-1">
                                                        <Play size={14} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Scrobbles</span>
                                                    </div>
                                                    <p className="text-2xl font-black text-white">{parseInt(lastfmData.stats?.playcount || '0').toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bio Section */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-primary/10 rounded-2xl">
                                                <Info className="text-primary" size={24} />
                                            </div>
                                            <h3 className="text-3xl font-black tracking-tighter">Biography</h3>
                                        </div>
                                        <div className="prose prose-invert max-w-none">
                                            <p className="text-lg leading-relaxed text-on-surface-variant/80 font-medium whitespace-pre-line bg-surface-variant/40 p-8 rounded-[2.5rem] border border-white/5">
                                                {lastfmData.bio?.content?.replace(/<a.*?>.*?<\/a>/g, '') || 'Biography not available.'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Similar Artists */}
                                    {lastfmData.similar?.artist?.length > 0 && (
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-secondary/10 rounded-2xl">
                                                    <Users className="text-secondary" size={24} />
                                                </div>
                                                <h3 className="text-3xl font-black tracking-tighter">Similar Artists</h3>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                                {lastfmData.similar.artist.map((artist: any, i: number) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => {
                                                            setShowMoreInfo(false);
                                                            navigate(`/artist/${encodeURIComponent(artist.name)}`);
                                                        }}
                                                        className="group space-y-3"
                                                    >
                                                        <div className="aspect-square rounded-[2rem] bg-white/5 border border-white/5 overflow-hidden relative shadow-lg group-hover:shadow-secondary/20 transition-all duration-500">
                                                            <img
                                                                src={artist.image?.find((i: any) => i.size === 'large')?.['#text']}
                                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                                alt={artist.name}
                                                            />
                                                            <div className="absolute inset-0 bg-secondary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </div>
                                                        <p className="text-sm font-bold truncate px-2 text-on-surface-variant group-hover:text-secondary transition-colors">{artist.name}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-8 border-t border-white/5 text-center">
                                        <a
                                            href={lastfmData.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 rounded-full text-xs font-black uppercase tracking-[0.2em] transition-all"
                                        >
                                            View full profile on Last.fm <ExternalLink size={14} />
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-20 text-center">
                                    <p className="text-xl font-bold text-on-surface-variant opacity-40">No additional information found.</p>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default ArtistDetail;
