import { useEffect, useState, useMemo } from 'react';
import { FolderPlus, Music, Disc, Mic2, RefreshCw, Search, X, ChevronLeft, ChevronRight, Play, Shuffle, LayoutGrid, List } from 'lucide-react';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import SongList from '../components/library/SongList';
import SongGrid from '../components/library/SongGrid';
import AlbumGrid from '../components/library/AlbumGrid';
import ArtistGrid from '../components/library/ArtistGrid';
import clsx from 'clsx';
import { motion } from 'framer-motion';

type Tab = 'songs' | 'albums' | 'artists' | 'folders';

const Library = () => {
    const [activeTab, setActiveTab] = useState<Tab>('songs');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const [folders, setFolders] = useState<{ id: number; path: string; added_at: string }[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageInput, setPageInput] = useState('1');

    useEffect(() => {
        setPageInput(String(currentPage));
    }, [currentPage]);

    const handlePageSubmit = (valStr: string) => {
        const val = parseInt(valStr);
        const max = Math.ceil(tracks.length / itemsPerPage);
        if (!isNaN(val) && val >= 1 && val <= max) {
            setCurrentPage(val);
        } else {
            setPageInput(String(currentPage));
        }
    };
    const itemsPerPage = 50;
    const { tracks, isLoading, scanProgress, refreshLibrary, setScanProgress } = useLibraryStore();

    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return null;
        const q = searchQuery.toLowerCase();
        return {
            songs: tracks.filter(t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.album.toLowerCase().includes(q)),
            albums: tracks.filter(t => t.album.toLowerCase().includes(q)),
            artists: tracks.filter(t => t.artist.toLowerCase().includes(q))
        };
    }, [searchQuery, tracks]);

    useEffect(() => {
        refreshLibrary();

        if (window.ipcRenderer) {
            // Expose a way to refresh everything from outside
            (window as any).refreshLibraryFromList = async () => {
                await refreshLibrary();
                loadFolders();
                setRefreshKey(prev => prev + 1);
            };
            // Explicit store refresher
            (window as any).refreshLibraryStore = refreshLibrary;
        }

        if (!window.ipcRenderer) return;

        // Listen for scan events
        const removeProgress = window.ipcRenderer.on('scan-progress', (_event, data) => {
            setScanProgress(data);
        });
        const removeComplete = window.ipcRenderer.on('scan-complete', () => {
            setScanProgress(null);
            refreshLibrary();
            loadFolders();
        });

        return () => {
            if (removeProgress) removeProgress();
            if (removeComplete) removeComplete();
        };
    }, []);

    useEffect(() => {
        if (activeTab === 'folders') {
            loadFolders();
        }
    }, [activeTab]);

    const loadFolders = async () => {
        if (window.ipcRenderer) {
            const data = await window.ipcRenderer.invoke('library:getFolders');
            setFolders(data || []);
        }
    };

    const handleAddFolder = async () => {
        const path = await window.ipcRenderer.invoke('dialog:openDirectory');
        if (path) {
            window.ipcRenderer.invoke('library:scan', path);
        }
    };

    const handleRemoveFolder = async (path: string) => {
        if (!window.ipcRenderer) return;
        const confirm = window.confirm('Are you sure you want to remove this folder? This will remove its songs from your library.');
        if (confirm) {
            await window.ipcRenderer.invoke('library:removeFolder', path);
            loadFolders();
            refreshLibrary();
        }
    };

    const handleRefresh = () => {
        refreshLibrary();
        setSearchQuery('');
        setCurrentPage(1);
        setRefreshKey(prev => prev + 1);
    };

    const tabs = [
        { id: 'songs', label: 'Songs', icon: Music },
        { id: 'albums', label: 'Albums', icon: Disc },
        { id: 'artists', label: 'Artists', icon: Mic2 },
        { id: 'folders', label: 'Folders', icon: FolderPlus },
    ];

    return (
        <div className="space-y-6 pb-20 pt-10">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary shadow-2xl shadow-primary/20 border border-primary/30 outline outline-1 outline-primary/20">
                        <Music size={32} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-primary tracking-tighter italic">
                            Local Library
                        </h1>
                        <p className="text-on-surface-variant font-medium text-xs tracking-[0.2em] opacity-60">Your Music Collection</p>
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    <button
                        onClick={handleRefresh}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-full transition-colors shadow-lg hover:shadow-primary/30 active:scale-95 transform duration-200"
                        title="Refresh & Reset Library"
                    >
                        <RefreshCw size={18} className={clsx({ 'animate-spin': isLoading })} />
                        <span className="font-bold text-sm">Refresh</span>
                    </button>
                    <button
                        onClick={() => {
                            if (tracks.length > 0) {
                                const state = usePlayerStore.getState() as any;
                                state.setQueue(tracks);
                                state.play(tracks[0]);
                            }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-full transition-colors shadow-lg hover:shadow-primary/30 active:scale-95 transform duration-200"
                    >
                        <Play size={18} fill="currentColor" />
                        <span className="font-bold text-sm cursor-pointer select-none">Play All</span>
                    </button>
                    <button
                        onClick={() => {
                            if (tracks.length > 0) {
                                const shuffled = [...tracks].sort(() => Math.random() - 0.5);
                                const state = usePlayerStore.getState() as any;
                                state.setQueue(shuffled);
                                state.play(shuffled[0]);
                                if (!state.shuffle) state.toggleShuffle();
                            }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-full transition-colors shadow-lg hover:shadow-primary/30 active:scale-95 transform duration-200"
                    >
                        <Shuffle size={18} />
                        <span className="font-bold text-sm cursor-pointer select-none">Shuffle All</span>
                    </button>
                    <button
                        onClick={handleAddFolder}
                        className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-full transition-colors hover:bg-primary hover:text-on-primary active:scale-95 transform duration-200"
                    >
                        <FolderPlus size={18} />
                        <span className="font-bold text-sm cursor-pointer select-none">Add Folder</span>
                    </button>
                </div>
            </div>

            {/* Tabs and Search Line */}
            <div className="flex flex-col md:flex-row items-center gap-4 bg-surface-variant/10 p-2 rounded-[2rem] border border-white/5">
                <div className="flex space-x-1 bg-surface-variant/30 p-1 rounded-full w-full md:w-fit">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as Tab)}
                                className={clsx(
                                    'flex items-center gap-2 px-6 py-2 rounded-full text-sm font-black uppercase tracking-widest transition-all duration-300',
                                    isActive
                                        ? 'bg-primary text-on-primary shadow-lg shadow-primary/20 scale-105'
                                        : 'text-on-surface-variant/60 hover:text-on-surface hover:bg-surface-variant/50'
                                )}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Local Search and Pagination - Now extended and on the same line */}
                <div className="flex-1 flex gap-2">
                    <div className="relative flex-1 bg-surface-variant/20 rounded-full border border-primary/40 p-1 flex items-center focus-within:ring-2 focus-within:ring-primary/30 transition-all outline outline-1 outline-primary/40">
                        <Search className="absolute left-4 text-primary" size={16} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder="Search your library..."
                            className="w-full bg-transparent outline-none pl-10 pr-10 py-2.5 text-sm font-bold text-on-surface placeholder:text-on-surface-variant/30"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 p-1.5 rounded-full text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    
                    {activeTab === 'songs' && (
                        <button 
                            onClick={() => setViewMode(prev => prev === 'list' ? 'grid' : 'list')} 
                            className="p-3 bg-surface-variant/20 rounded-full border border-primary/30 text-primary hover:bg-primary/10 hover:shadow-lg transition-all"
                            title={viewMode === 'list' ? 'Thumbnail View' : 'List View'}
                        >
                            {viewMode === 'list' ? <LayoutGrid size={18} /> : <List size={18} />}
                        </button>
                    )}

                    {activeTab === 'songs' && !searchResults && viewMode === 'list' && (
                        <div className="flex items-center gap-3 bg-surface-variant/20 rounded-full border border-primary/30 p-1.5 outline outline-1 outline-primary/20 shadow-lg shadow-black/20">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                className="p-2.5 rounded-full text-on-surface-variant hover:text-primary hover:bg-primary/10 disabled:opacity-20 transition-all active:scale-90"
                            >
                                <ChevronLeft size={20} />
                            </button>

                            <div className="flex items-center gap-3 px-2">
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    className={clsx(
                                        "text-[10px] font-black transition-all hover:text-primary",
                                        currentPage === 1 ? "text-primary scale-110" : "text-on-surface-variant/40"
                                    )}
                                >
                                    1
                                </button>
                                <div className="h-1 w-1 rounded-full bg-white/10" />

                                <div className="relative group">
                                    <input
                                        type="text"
                                        value={pageInput}
                                        onChange={(e) => setPageInput(e.target.value)}
                                        onBlur={(e) => handlePageSubmit(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handlePageSubmit((e.target as HTMLInputElement).value);
                                            }
                                        }}
                                        className="w-14 bg-primary/10 border border-primary/20 rounded-lg py-1.5 text-center text-sm font-black text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-inner"
                                    />
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-surface border border-white/10 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                        Jump to
                                    </div>
                                </div>

                                <div className="h-1 w-1 rounded-full bg-white/10" />
                                <button
                                    onClick={() => setCurrentPage(Math.ceil(tracks.length / itemsPerPage))}
                                    className={clsx(
                                        "text-[10px] font-black transition-all hover:text-primary",
                                        currentPage === Math.ceil(tracks.length / itemsPerPage) ? "text-primary scale-110" : "text-on-surface-variant/40"
                                    )}
                                >
                                    {Math.ceil(tracks.length / itemsPerPage)}
                                </button>
                            </div>

                            <button
                                disabled={currentPage >= Math.ceil(tracks.length / itemsPerPage)}
                                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(tracks.length / itemsPerPage), prev + 1))}
                                className="p-2.5 rounded-full text-on-surface-variant hover:text-primary hover:bg-primary/10 disabled:opacity-20 transition-all active:scale-90"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Scan Progress */}
            {scanProgress && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center gap-4"
                >
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-primary">Scanning Library...</p>
                        <p className="text-xs text-primary/70">Processed {scanProgress.processed} files</p>
                    </div>
                </motion.div>
            )}

            {/* Content */}
            <div className="min-h-[300px]">
                {searchResults ? (
                    <div className="space-y-12">
                        {searchResults.artists.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 px-2">
                                    <div className="p-2 bg-purple-500/20 text-purple-500 rounded-xl"><Mic2 size={20} /></div>
                                    <h2 className="text-2xl font-black">Matching Artists</h2>
                                </div>
                                <ArtistGrid tracks={searchResults.artists} />
                            </div>
                        )}
                        {searchResults.albums.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 px-2">
                                    <div className="p-2 bg-secondary/20 text-secondary rounded-xl"><Disc size={20} /></div>
                                    <h2 className="text-2xl font-black">Matching Albums</h2>
                                </div>
                                <AlbumGrid tracks={searchResults.albums} />
                            </div>
                        )}
                        {searchResults.songs.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 px-2">
                                    <div className="p-2 bg-primary/20 text-primary rounded-xl"><Music size={20} /></div>
                                    <h2 className="text-2xl font-black">Matching Songs</h2>
                                </div>
                                {viewMode === 'grid' ? (
                                    <SongGrid tracks={searchResults.songs} onPlay={(t) => usePlayerStore.getState().play(t)} />
                                ) : (
                                    <SongList tracks={searchResults.songs} onPlay={(t) => usePlayerStore.getState().play(t)} />
                                )}
                            </div>
                        )}
                        {searchResults.songs.length === 0 && searchResults.albums.length === 0 && searchResults.artists.length === 0 && (
                            <div className="text-center py-20 text-on-surface-variant font-medium">
                                No results found for "{searchQuery}"
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {activeTab === 'songs' && (
                            viewMode === 'grid' ? (
                                <SongGrid tracks={tracks} onPlay={(t) => usePlayerStore.getState().play(t)} />
                            ) : (
                                <SongList
                                    key={refreshKey}
                                    tracks={tracks}
                                    onPlay={(t) => usePlayerStore.getState().play(t)}
                                    currentPage={currentPage}
                                    itemsPerPage={itemsPerPage}
                                    onPageChange={setCurrentPage}
                                />
                            )
                        )}
                        {activeTab === 'albums' && (
                            <AlbumGrid tracks={tracks} />
                        )}
                        {activeTab === 'artists' && (
                            <ArtistGrid tracks={tracks} />
                        )}
                        {activeTab === 'folders' && (
                            <div className="space-y-4">
                                {folders.length === 0 ? (
                                    <div className="text-center p-12 text-on-surface-variant/50">
                                        <FolderPlus size={48} className="mx-auto mb-4 opacity-50" />
                                        <p>No folders added yet. Click "Add Folder" to scan your music.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {folders.map((folder) => (
                                            <div key={folder.id} className="bg-surface-variant/20 border border-white/5 rounded-2xl p-4 flex flex-col justify-between group">
                                                <div className="flex items-start gap-4 mb-4">
                                                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                                                        <FolderPlus size={24} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-sm font-bold text-on-background truncate" title={folder.path}>
                                                            {folder.path.split(/[\\/]/).pop() || folder.path}
                                                        </h3>
                                                        <p className="text-xs text-on-surface-variant truncate mt-1">
                                                            {folder.path}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest mt-1">
                                                            {tracks.filter(t => t.path && (t.path.startsWith(folder.path) || t.path.includes(folder.path))).length} songs
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between mt-4">
                                                    <span className="text-[10px] text-on-surface-variant/60 uppercase tracking-wider font-bold">
                                                        Added {new Date(folder.added_at).toLocaleDateString()}
                                                    </span>
                                                    <button
                                                        onClick={() => handleRemoveFolder(folder.path)}
                                                        className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-xs font-bold transition-all"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Library;
