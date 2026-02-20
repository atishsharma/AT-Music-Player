import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { usePlayerStore } from '../store/playerStore';
import { useSearchStore, SearchProvider } from '../store/searchStore';
import { Play, Search as SearchIcon, Globe, Music, Download, LayoutGrid, Plus, Clock, Youtube, Video } from 'lucide-react';
import SongList from '../components/library/SongList';
import clsx from 'clsx';

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
        isLoading
    } = useSearchStore();

    const { play } = usePlayerStore();
    const [localInput, setLocalInput] = useState(query || urlQuery);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [cacheStats, setCacheStats] = useState<{ size: string, count: number } | null>(null);

    const fetchCacheStats = async () => {
        try {
            const stats = await window.ipcRenderer.invoke('cache:getStats');
            setCacheStats(stats);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchCacheStats();
    }, []);

    const handleClearCache = async () => {
        if (confirm('Clear the audio cache? This will remove all temporary stream files.')) {
            await window.ipcRenderer.invoke('cache:clear');
            fetchCacheStats();
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
                // Show loading or something? We have the track title/artist
                // We'll just initiate play, but play() in store might need to handle the flow or we handle it here
                const videoId = track.video_id || track.id;
                const cached = await window.ipcRenderer.invoke('youtube:cacheAudio', videoId);
                if (cached && cached.url) {
                    play({ ...track, path: cached.url });
                } else {
                    play(track); // Fallback to streaming if caching fails
                }
            } catch (err) {
                console.error("Cache and play failed:", err);
                play(track);
            }
        } else {
            play(track);
        }
    };

    const providers: { id: SearchProvider; label: string; icon: any; color: string }[] = [
        { id: 'all', label: 'All', icon: LayoutGrid, color: 'text-gray-400' },
        { id: 'youtube', label: 'YouTube Video', icon: Youtube, color: 'text-red-500' },
        { id: 'library', label: 'Library', icon: Music, color: 'text-primary-500' },
    ];

    const currentResults = () => {
        if (activeProvider === 'all') {
            return [
                ...lastResults.youtube
            ];
        }
        return lastResults[activeProvider as keyof typeof lastResults] || [];
    };

    const startDownload = async (track: any) => {
        const videoId = track.video_id || track.youtubeId || track.id;
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        navigate(`/downloads?url=${encodeURIComponent(url)}`);
    };

    return (
        <div className="space-y-8 pb-32 max-w-6xl mx-auto px-4">
            {/* Internal Search Bar */}
            <div className="sticky -top-6 z-30 bg-background py-8 -mx-10 px-10 border-b border-white/5 flex items-center gap-4">
                <form onSubmit={handleSearchSubmit} className="relative w-full max-w-3xl mx-auto flex-1">
                    <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant w-6 h-6" />
                    <input
                        type="text"
                        value={localInput}
                        onChange={(e) => setLocalInput(e.target.value)}
                        placeholder="Your Next Songs in One Search Away"
                        className="w-full h-16 pl-14 pr-6 rounded-3xl bg-surface-variant/40 border border-white/10 focus:ring-2 focus:ring-primary-500/50 focus:bg-surface-variant/60 transition-all text-xl font-semibold shadow-2xl"
                    />
                    {isLoading && (
                        <div className="absolute right-6 top-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                        </div>
                    )}
                </form>

                {/* Cache Stats */}
                {cacheStats && (
                    <div className="hidden lg:flex flex-col items-end gap-1 shrink-0">
                        <div className="text-[10px] uppercase font-black tracking-widest text-on-surface-variant">
                            Cache: {cacheStats.size} MB ({cacheStats.count} files)
                        </div>
                        <button
                            onClick={handleClearCache}
                            className="text-xs font-bold text-red-400 hover:text-red-300 hover:underline transition-colors"
                        >
                            Clear Cache
                        </button>
                    </div>
                )}
            </div>

            {/* Recent Searches */}
            {!query && recentSearches.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                        <Clock size={16} /> Recent Searches
                    </h2>
                    <div className="flex flex-wrap gap-2">
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
            )}

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
                {activeProvider === 'all' ? (
                    <>
                        {lastResults.library.length > 0 && (
                            <section>
                                <h2 className="text-2xl font-black mb-6 flex items-center gap-3 px-2 text-primary-500 uppercase tracking-widest">
                                    <Music size={28} /> Library
                                </h2>
                                <SongList tracks={lastResults.library} onPlay={handlePlay} />
                            </section>
                        )}

                        {lastResults.youtube.length > 0 && (
                            <section>
                                <h2 className="text-2xl font-black mb-6 flex items-center gap-3 px-2 text-red-600 uppercase tracking-widest">
                                    <Globe size={28} /> YouTube
                                </h2>
                                <div className="space-y-2 bg-surface/20 rounded-3xl p-2 border border-white/5">
                                    {lastResults.youtube.map((track, i) => (
                                        <SearchResultItem
                                            key={track.id + i}
                                            track={track}
                                            onPlay={handlePlay}
                                            onDownload={() => startDownload(track)}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                    </>
                ) : (
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
                )}

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

            {/* Removed DownloadModal */}
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
