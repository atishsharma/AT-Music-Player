import { useEffect, useState } from 'react';
import { FolderPlus, Music, Disc, Mic2, RefreshCw } from 'lucide-react';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import SongList from '../components/library/SongList';
import AlbumGrid from '../components/library/AlbumGrid';
import ArtistGrid from '../components/library/ArtistGrid';
import clsx from 'clsx';
import { motion } from 'framer-motion';

type Tab = 'songs' | 'albums' | 'artists' | 'folders';

const Library = () => {
    const [activeTab, setActiveTab] = useState<Tab>('songs');
    const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
    const [folders, setFolders] = useState<{ id: number; path: string; added_at: string }[]>([]);
    const { tracks, isLoading, scanProgress, refreshLibrary, setScanProgress } = useLibraryStore();

    useEffect(() => {
        refreshLibrary();

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

    const handleFetchMetadata = async () => {
        if (isFetchingMetadata) return;
        setIsFetchingMetadata(true);
        try {
            // Fetch metadata for tracks that don't have enough (e.g. Unknown Artist or Album)
            const targetTracks = tracks.filter(t => t.artist === 'Unknown Artist' || t.album === 'Unknown Album' || !t.image_path);
            if (targetTracks.length === 0) {
                alert('All tracks already have metadata!');
                return;
            }

            let successfulCount = 0;
            for (const track of targetTracks) {
                // Try MusicBrainz search first
                const artistResults = await window.ipcRenderer.invoke('metadata:searchArtist', track.artist === 'Unknown Artist' ? track.title : track.artist);
                if (artistResults && artistResults.length > 0) {
                    const artist = artistResults[0];
                    // Update track in DB (we need an IPC for this)
                    await window.ipcRenderer.invoke('library:updateTrackMetadata', {
                        id: track.id,
                        artist: artist.name,
                        // Could also fetch album/cover here
                    });
                    successfulCount++;
                }
            }
            alert(`Updated metadata for ${successfulCount} tracks.`);
            refreshLibrary();
        } catch (err) {
            console.error('Failed to fetch metadata:', err);
        } finally {
            setIsFetchingMetadata(false);
        }
    };

    const tabs = [
        { id: 'songs', label: 'Songs', icon: Music },
        { id: 'albums', label: 'Albums', icon: Disc },
        { id: 'artists', label: 'Artists', icon: Mic2 },
        { id: 'folders', label: 'Folders', icon: FolderPlus },
    ];

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-secondary-600">
                    Your Library
                </h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => refreshLibrary()}
                        className="p-2 text-on-surface-variant hover:bg-surface-variant rounded-full transition-colors"
                        title="Refresh Library"
                    >
                        <RefreshCw size={20} className={clsx({ 'animate-spin': isLoading })} />
                    </button>
                    <button
                        onClick={handleFetchMetadata}
                        disabled={isFetchingMetadata}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-full transition-all shadow-lg active:scale-95 transform duration-200",
                            isFetchingMetadata ? "bg-surface-variant text-on-surface-variant cursor-wait opacity-50" : "bg-primary text-on-primary hover:shadow-primary/30"
                        )}
                        title="Fetch Metadata for Unknown Tracks"
                    >
                        {isFetchingMetadata ? <RefreshCw size={18} className="animate-spin" /> : <Music size={18} />}
                        <span>{isFetchingMetadata ? 'Fetching...' : 'Fetch Metadata'}</span>
                    </button>
                    <button
                        onClick={handleAddFolder}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-full transition-colors shadow-lg hover:shadow-primary/30 active:scale-95 transform duration-200"
                    >
                        <FolderPlus size={18} />
                        <span>Add Folder</span>
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-surface-variant/30 p-1 rounded-xl w-fit">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as Tab)}
                            className={clsx(
                                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                                isActive
                                    ? 'bg-primary text-on-primary shadow-sm'
                                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50'
                            )}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
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
                {activeTab === 'songs' && (
                    <SongList tracks={tracks} onPlay={(t) => usePlayerStore.getState().play(t)} />
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
            </div>
        </div>
    );
};

export default Library;
