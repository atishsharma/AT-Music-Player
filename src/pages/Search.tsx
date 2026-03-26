import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { usePlayerStore } from '../store/playerStore';
import { useSearchStore, SearchProvider } from '../store/searchStore';
import { Search as SearchIcon, Play, Plus, Youtube, Music, Clock, X, Video, Download, Layers, Trash2, CheckSquare, Square, Check, FolderDown } from 'lucide-react';
import SongList from '../components/library/SongList';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { YtDlpFooter } from '../components/common/YtDlpFooter';

const SearchPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const urlQuery = searchParams.get('q') || '';

    const {
        query,
        setQuery,
        lastResults,
        activeProvider,
        setActiveProvider,
        performSearch,
        loadMore,
        isLoading,
        clearSearch
    } = useSearchStore();

    const { play } = usePlayerStore();
    const [localInput, setLocalInput] = useState(query || urlQuery);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [cacheStats, setCacheStats] = useState<{ size: string, count: number, files?: any[] } | null>(null);
    const [showCachePopup, setShowCachePopup] = useState(false);
    const [showAllCache, setShowAllCache] = useState(false);
    const [selectedCacheFiles, setSelectedCacheFiles] = useState<string[]>([]);
    const [cacheDownload, setCacheDownload] = useState<{ videoId: string; title: string; progress: number; status: string } | null>(null);

    const fetchCacheStats = useCallback(async () => {
        try {
            const stats = await window.ipcRenderer.invoke('cache:getStats');
            setCacheStats(stats);
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => {
        fetchCacheStats();
    }, [fetchCacheStats]);

    // Listen for cache progress + stats-changed events from backend
    useEffect(() => {
        const handleProgress = (_e: any, data: { videoId: string; progress: number; status: string }) => {
            if (data.status === 'complete' || data.status === 'cancelled' || data.status === 'error') {
                // Keep showing 100% briefly then clear
                if (data.status === 'complete') {
                    setCacheDownload(prev => prev ? { ...prev, progress: 100, status: 'complete' } : null);
                    setTimeout(() => setCacheDownload(null), 1500);
                } else {
                    setCacheDownload(null);
                }
            } else {
                setCacheDownload(prev => ({
                    videoId: data.videoId,
                    title: prev?.title || data.videoId,
                    progress: data.progress,
                    status: data.status
                }));
            }
        };

        const handleStatsChanged = () => {
            fetchCacheStats();
        };

        const unsubProgress = window.ipcRenderer?.on?.('cache:progress', handleProgress);
        const unsubStats = window.ipcRenderer?.on?.('cache:stats-changed', handleStatsChanged);

        return () => {
            if (unsubProgress) unsubProgress();
            if (unsubStats) unsubStats();
        };
    }, [fetchCacheStats]);

    const handleClearCache = async () => {
        if (confirm('Clear the audio cache? This will remove all temporary stream files.')) {
            await window.ipcRenderer.invoke('cache:clear');
            fetchCacheStats();
            setSelectedCacheFiles([]);
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedCacheFiles.length === 0) return;
        if (confirm(`Delete ${selectedCacheFiles.length} selected files from cache?`)) {
            await window.ipcRenderer.invoke('cache:delete', selectedCacheFiles);
            fetchCacheStats();
            setSelectedCacheFiles([]);
        }
    };

    const toggleSelectTrack = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setSelectedCacheFiles(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (!cacheStats?.files) return;
        if (selectedCacheFiles.length === cacheStats.files.length) {
            setSelectedCacheFiles([]);
        } else {
            setSelectedCacheFiles(cacheStats.files.map(f => f.id));
        }
    };

    useEffect(() => {
        const history = localStorage.getItem('recent-searches');
        if (history) setRecentSearches(JSON.parse(history));
    }, []);

    const saveSearch = (term: string) => {
        const newHistory = [term, ...recentSearches.filter(t => t !== term)].slice(0, 10);
        setRecentSearches(newHistory);
        localStorage.setItem('recent-searches', JSON.stringify(newHistory));
    };

    // Sync URL query with store on mount
    useEffect(() => {
        if (urlQuery && urlQuery !== query) {
            setQuery(urlQuery);
            performSearch(urlQuery);
        }
    }, [urlQuery]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (localInput.trim()) {
            setSearchParams({ q: localInput.trim() });
            performSearch(localInput.trim());
            saveSearch(localInput.trim());
        }
    };

    const handlePlay = async (track: any) => {
        if (track.source === 'youtube' || track.source === 'ytmusic') {
            try {
                const videoId = track.video_id || track.id;

                // Cancel any previous cache download before starting a new one
                await window.ipcRenderer.invoke('youtube:cancelCacheAudio');

                // Set initial progress state with the track title
                setCacheDownload({ videoId, title: track.title || videoId, progress: 0, status: 'downloading' });

                const cached = await window.ipcRenderer.invoke('youtube:cacheAudio', videoId);
                if (cached && cached.url) {
                    play({ ...track, path: cached.url });
                } else if (cached === null) {
                    // Download was cancelled, do nothing
                } else {
                    play(track); // Fallback to streaming if caching fails
                }
            } catch (err) {
                console.error("Cache and play failed:", err);
                setCacheDownload(null);
                play(track);
            }
        } else {
            play(track);
        }
    };

    const providers: { id: SearchProvider; label: string; icon: any; color: string }[] = [
        { id: 'youtube', label: 'YouTube Video', icon: Youtube, color: 'text-red-500' },
        { id: 'library', label: 'Library', icon: Music, color: 'text-primary-500' },
    ];

    const currentResults = () => {
        return lastResults[activeProvider as keyof typeof lastResults] || [];
    };

    const startDownload = async (track: any) => {
        const videoId = track.video_id || track.youtubeId || track.id;
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        navigate(`/downloads?url=${encodeURIComponent(url)}`);
    };

    const handleMoveToLibrary = async (e: React.MouseEvent, track: any) => {
        e.stopPropagation();
        try {
            const result = await window.ipcRenderer.invoke('cache:moveToLibrary', {
                id: track.id || track.video_id,
                title: track.title,
                artist: track.artist,
                duration: track.duration || 0,
                thumbnail: track.thumbnail || track.image_path || '',
                video_id: track.video_id || track.id
            });
            if (result?.success) {
                (window as any).showToast?.(`"${track.title}" moved to Song Library`);
                fetchCacheStats();
            } else if (result?.error === 'already_exists') {
                (window as any).showToast?.(`"${track.title}" already exists in Song Library`);
            } else {
                (window as any).showToast?.(result?.error || 'Failed to move to library');
            }
        } catch (err) {
            console.error('Move to library failed:', err);
            (window as any).showToast?.('Failed to move to library');
        }
    };

    return (
        <div className="space-y-8 pb-32 max-w-6xl mx-auto px-4 pt-12">
            {/* Redesigned Title Bar */}
            <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md py-6 -mx-4 px-4 border-b border-white/5 flex flex-col md:flex-row items-center gap-6">
                <div className="flex items-center gap-4 shrink-0">
                    <div className="w-14 h-14 rounded-[1.25rem] bg-primary/10 flex items-center justify-center text-primary shadow-2xl shadow-primary/20 border border-primary/30 outline outline-1 outline-primary/20">
                        <SearchIcon size={28} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-primary tracking-tighter italic">
                            Search
                        </h1>
                        <p className="text-on-surface-variant font-medium text-[10px] tracking-[0.2em] opacity-60">Powered By Yt-DLP</p>
                    </div>
                </div>

                <form onSubmit={handleSearchSubmit} className="relative flex-1 group no-drag w-full md:w-auto">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-primary group-focus-within:scale-110 transition-transform">
                        <SearchIcon size={20} />
                    </div>
                    <input
                        type="text"
                        value={localInput}
                        onChange={(e) => setLocalInput(e.target.value)}
                        placeholder="Discover your next favorite track..."
                        className="w-full h-14 pl-14 pr-14 rounded-full bg-surface-variant/20 border border-primary/20 outline outline-1 outline-primary/10 focus:outline-primary/40 focus:ring-4 focus:ring-primary/10 transition-all text-lg font-bold text-on-surface placeholder:text-on-surface-variant/30 shadow-lg"
                    />
                    {localInput && (
                        <button
                            type="button"
                            onClick={() => {
                                setLocalInput('');
                                setSearchParams({});
                                clearSearch();
                            }}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors p-1"
                        >
                            <X size={18} />
                        </button>
                    )}
                    {isLoading && (
                        <div className="absolute right-14 top-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
                        </div>
                    )}
                </form>

                {/* Cache Info Box */}
                <div className="relative shrink-0">
                    <button
                        onClick={() => setShowCachePopup(!showCachePopup)}
                        className="flex items-center gap-3 px-4 py-2 rounded-xl bg-surface-variant/20 border border-primary/40 outline outline-1 outline-primary/40 hover:bg-primary/5 transition-all group"
                    >
                        <Layers size={18} className="text-primary group-hover:rotate-12 transition-transform" />
                        <div className="text-left">
                            <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 leading-none mb-1">Stream Cache</div>
                            <div className="text-xs font-bold text-primary leading-none">
                                {cacheStats?.size || '0.00'} MB <span className="text-on-surface-variant/40 ml-1">• {cacheStats?.count || 0} Files</span>
                            </div>
                        </div>
                    </button>

                    {/* Cache Popup */}
                    {showCachePopup && cacheStats && (
                        <div className="absolute right-0 top-full mt-4 w-80 bg-surface p-4 rounded-2xl border border-primary/20 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">Cached Songs</h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => { setShowAllCache(true); setShowCachePopup(false); }}
                                        className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-on-primary transition-all border border-primary/20"
                                        title="View All"
                                    >
                                        View All
                                    </button>
                                    <button
                                        onClick={handleClearCache}
                                        className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                        title="Purge Cache"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <div className="max-h-80 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                                {cacheStats.files && cacheStats.files.length > 0 ? (
                                    <>
                                        {[...(cacheStats.files || [])].reverse().slice(0, 5).map((track, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handlePlay(track)}
                                                className="w-full text-left px-3 py-2 rounded-lg bg-surface-variant/5 hover:bg-primary/10 text-[11px] font-medium text-on-surface-variant/80 transition-all flex items-center gap-3 group"
                                            >
                                                <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center shrink-0">
                                                    <Play size={10} className="text-primary fill-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <Music size={10} className="text-primary group-hover:hidden" />
                                                </div>
                                                <div className="flex-1 truncate">
                                                    <div className="font-bold text-on-surface truncate">{track.title}</div>
                                                    <div className="opacity-50 text-[9px] uppercase tracking-tighter">{track.artist}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </>
                                ) : (
                                    <div className="py-4 text-center text-xs text-on-surface-variant/40 italic">Cache is empty</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* View All Cache Modal */}
            <AnimatePresence>
                {showAllCache && cacheStats && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6"
                    >
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAllCache(false)} />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-2xl bg-surface rounded-[2.5rem] border border-primary/20 p-8 shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-6">
                                    <button
                                        onClick={toggleSelectAll}
                                        className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-on-primary transition-all border border-primary/20"
                                        title={selectedCacheFiles.length === (cacheStats.files?.length || 0) ? "Deselect All" : "Select All"}
                                    >
                                        {selectedCacheFiles.length === (cacheStats.files?.length || 0) && selectedCacheFiles.length > 0 ? (
                                            <CheckSquare size={24} />
                                        ) : (
                                            <Square size={24} />
                                        )}
                                    </button>
                                    <div>
                                        <h2 className="text-2xl font-black text-primary italic tracking-tighter uppercase leading-tight">Full Stream Cache</h2>
                                        <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest mt-1">
                                            {selectedCacheFiles.length > 0 ? `${selectedCacheFiles.length} SELECTED • ` : ''}
                                            Total: {cacheStats?.count || 0} files • {cacheStats?.size || '0.00'} MB
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setShowAllCache(false); setSelectedCacheFiles([]); }}
                                    className="p-3 rounded-full hover:bg-surface-variant/20 text-on-surface-variant transition-all border border-white/5"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-2">
                                {cacheStats.files?.map((track, idx) => {
                                    const isSelected = selectedCacheFiles.includes(track.id);
                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => handlePlay(track)}
                                            className={clsx(
                                                "group flex items-center gap-4 p-3 rounded-2xl border transition-all duration-300 cursor-pointer",
                                                isSelected
                                                    ? "bg-primary/20 border-primary/40 shadow-lg shadow-primary/10"
                                                    : "bg-surface-variant/5 border-white/5 hover:bg-primary/10 hover:border-primary/20"
                                            )}
                                        >
                                            <button
                                                onClick={(e) => toggleSelectTrack(e, track.id)}
                                                className={clsx(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all border",
                                                    isSelected ? "bg-primary text-on-primary border-primary" : "bg-surface-variant/20 border-white/10 text-on-surface-variant/40 hover:border-primary/40"
                                                )}
                                            >
                                                {isSelected ? <Check size={20} /> : <Square size={18} className="opacity-40" />}
                                            </button>

                                            <div className="w-12 h-12 rounded-xl bg-surface-variant/30 flex items-center justify-center shrink-0 border border-white/5 group-hover:bg-primary group-hover:text-on-primary transition-all">
                                                <Play size={20} className="fill-current" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className={clsx("font-black truncate text-lg tracking-tight transition-colors", isSelected ? "text-primary" : "text-on-surface group-hover:text-primary")}>{track.title}</div>
                                                <div className="text-sm font-bold text-on-surface-variant/50 uppercase tracking-widest">{track.artist}</div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    onClick={(e) => handleMoveToLibrary(e, track)}
                                                    className="p-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-on-primary transition-all border border-primary/20 opacity-0 group-hover:opacity-100"
                                                    title="Move to Song Library"
                                                >
                                                    <FolderDown size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/5 flex justify-end gap-4">
                                {selectedCacheFiles.length > 0 ? (
                                    <button
                                        onClick={handleDeleteSelected}
                                        className="px-8 py-3 rounded-full bg-primary text-on-primary font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                                    >
                                        <Trash2 size={16} /> DELETE SELECTED ({selectedCacheFiles.length})
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleClearCache}
                                        className="px-6 py-3 rounded-full bg-red-500/10 text-red-500 font-black uppercase tracking-widest text-xs hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
                                    >
                                        <Trash2 size={16} /> WIPE ALL CACHE
                                    </button>
                                )}
                                <button
                                    onClick={() => { setShowAllCache(false); setSelectedCacheFiles([]); }}
                                    className="px-8 py-3 rounded-full bg-surface-variant/20 text-on-surface-variant font-black uppercase tracking-widest text-xs hover:bg-surface-variant/40 transition-all"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cache Download Progress Bar */}
            <AnimatePresence>
                {cacheDownload && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="max-w-2xl mx-auto"
                    >
                        <div className="bg-surface-variant/20 border border-primary/20 rounded-2xl px-4 py-3">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary truncate max-w-[300px]">
                                    {cacheDownload.status === 'complete' ? '✓ Cached' : 'Caching before playing...'}
                                </span>
                                <span className="text-[10px] font-bold text-on-surface-variant/60 ml-2">
                                    {cacheDownload.progress}%
                                </span>
                            </div>
                            <div className="text-[10px] font-medium text-on-surface-variant/50 truncate mb-2">{cacheDownload.title}</div>
                            <div className="w-full h-2 rounded-full bg-surface-variant/30 overflow-hidden">
                                <motion.div
                                    className={clsx(
                                        "h-full rounded-full",
                                        cacheDownload.status === 'complete' ? "bg-green-500" : "bg-primary"
                                    )}
                                    initial={{ width: '0%' }}
                                    animate={{ width: `${cacheDownload.progress}%` }}
                                    transition={{ duration: 0.3, ease: 'easeOut' }}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Recent Searches */}
            {
                !query && recentSearches.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant flex items-center justify-center gap-2">
                            <Clock size={16} /> Recent Searches
                        </h2>
                        <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
                            {recentSearches.map((term) => (
                                <button
                                    key={term}
                                    onClick={() => {
                                        setLocalInput(term);
                                        setSearchParams({ q: term });
                                        performSearch(term);
                                        saveSearch(term);
                                    }}
                                    className="px-5 py-2.5 bg-surface-variant/40 hover:bg-surface-variant rounded-2xl text-sm font-bold border border-white/5 transition-all hover:scale-105"
                                >
                                    {term}
                                </button>
                            ))}
                            <button
                                onClick={() => {
                                    setRecentSearches([]);
                                    localStorage.removeItem('recent-searches');
                                }}
                                className="px-5 py-2.5 text-red-500/60 hover:text-red-500 text-sm font-black uppercase tracking-widest"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Provider Filter */}
            <div className="flex flex-wrap gap-3 justify-center">
                {providers.map((p) => (
                    <button
                        key={p.id}
                        onClick={() => setActiveProvider(p.id)}
                        className={clsx(
                            'flex items-center gap-2.5 px-8 py-3 rounded-2xl text-base font-black transition-all duration-500 border-2',
                            activeProvider === p.id
                                ? 'bg-primary border-primary text-on-primary shadow-lg shadow-primary/40 scale-105'
                                : 'bg-surface/30 border-white/5 text-on-surface-variant hover:bg-surface/50 hover:text-on-background hover:border-white/20'
                        )}
                    >
                        <p.icon size={20} className={activeProvider === p.id ? 'text-white' : p.color} />
                        {p.label}
                    </button>
                ))}
            </div>

            {/* Results List */}
            <div className="space-y-12">
                <div className="space-y-2 bg-surface/20 rounded-3xl p-2 border border-white/5">
                    {activeProvider === 'library' ? (
                        <SongList tracks={lastResults.library} onPlay={handlePlay} />
                    ) : (
                        lastResults[activeProvider as keyof typeof lastResults].map((track, i) => (
                            <SearchResultItem
                                key={track.id + i}
                                track={track}
                                onPlay={handlePlay}
                                onDownload={() => startDownload(track)}
                            />
                        ))
                    )}
                </div>

                {/* Load More Button */}
                {!isLoading && currentResults().length > 0 && activeProvider !== 'library' && (
                    <div className="flex justify-center pt-8">
                        <button
                            onClick={loadMore}
                            className="px-12 py-4 rounded-2xl bg-surface hover:bg-surface-variant text-on-background font-black border border-white/10 transition-all hover:scale-105 shadow-xl flex items-center gap-3"
                        >
                            <Plus size={20} /> Load More Results
                        </button>
                    </div>
                )}

                {!isLoading && currentResults().length === 0 && query && (
                    <div className="text-center py-32 text-on-surface-variant bg-surface/10 rounded-3xl border border-dashed border-white/5">
                        <SearchIcon size={80} className="mx-auto mb-6 opacity-10" />
                        <p className="text-2xl font-black uppercase tracking-widest">No results found for "{query}"</p>
                        <p className="mt-2 opacity-50">Try different keywords or check your connection.</p>
                    </div>
                )}
            </div>

            <YtDlpFooter />
        </div>
    );
};

const SearchResultItem = ({ track, onPlay, onDownload }: { track: any, onPlay: (t: any) => void, onDownload?: () => void }) => {
    const canDownload = track.source === 'youtube' || track.source === 'ytmusic';

    return (
        <div
            className="flex items-center gap-6 p-4 rounded-2xl hover:bg-white/5 cursor-pointer group transition-all duration-300"
            onClick={() => onPlay(track)}
        >
            <div className="relative w-24 h-24 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl group-hover:scale-105 transition-transform">
                <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={32} className="text-white fill-white" />
                </div>
                {/* Provider Badge */}
                <div className={clsx(
                    "absolute bottom-2 right-2 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-lg flex items-center gap-1",
                    track.source === 'spotify' ? "bg-green-500 text-black" :
                        track.source === 'ytmusic' ? "bg-red-400 text-white" : "bg-red-600 text-white"
                )}>
                    {track.source === 'youtube' && <Video size={10} />}
                    {track.source}
                </div>
            </div>

            <div className="flex-1 min-w-0 pr-4">
                <h3 className="text-lg font-black text-on-background truncate mb-1 group-hover:text-primary-400 transition-colors" title={track.title}>
                    {track.title}
                </h3>
                <div className="flex items-center gap-3 text-sm font-bold text-on-surface-variant">
                    <span className="truncate max-w-[200px]">{track.artist}</span>
                    {track.date && (
                        <>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <span className="opacity-60">{track.date}</span>
                        </>
                    )}
                    {track.duration && (
                        <>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <span className="opacity-60">
                                {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                            </span>
                        </>
                    )}
                </div>
            </div>

            {canDownload && onDownload && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDownload();
                    }}
                    className="p-5 mr-4 flex-shrink-0 bg-white/5 opacity-0 group-hover:opacity-100 hover:bg-primary-500 hover:text-white text-on-surface-variant rounded-full transition-all shadow-xl z-10"
                    title="Download options"
                >
                    <Download className="h-6 w-6" />
                </button>
            )}
        </div>
    );
};

export default SearchPage;
