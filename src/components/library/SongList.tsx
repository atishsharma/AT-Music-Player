import React, { useState, useMemo } from 'react';
import { Play, Plus, Minus, Heart, Edit2, Trash2, ArrowUpDown, AlignLeft } from 'lucide-react';
import { Track } from '../../types/library';
import { usePlaylistStore } from '../../store/playlistStore';
import { usePlayerStore } from '../../store/playerStore';
import { useFavoritesStore } from '../../store/favoritesStore';
import { useLibraryStore } from '../../store/libraryStore';
import { useNavigate } from 'react-router-dom';
import { toAtmusicUrl } from '../../utils/path';
import clsx from 'clsx';
import MetadataEditor from './MetadataEditor';
import LibraryLyricsModal from './LibraryLyricsModal';
import LyricsSearchModal from './LyricsSearchModal';

interface SongListProps {
    tracks: Track[];
    onPlay: (track: Track) => void;
    onRemove?: (track: Track) => void;
    currentPage?: number;
    itemsPerPage?: number;
    onPageChange?: (page: number) => void;
}

const SongList: React.FC<SongListProps> = ({ tracks, onPlay, onRemove, currentPage = 1, itemsPerPage = 40 }) => {
    const { addFavorite, removeFavorite, isFavorite } = useFavoritesStore();
    const navigate = useNavigate();
    const [editingTrack, setEditingTrack] = useState<Track | null>(null);
    const [lyricsModalStatus, setLyricsModalStatus] = useState<{ track: Track, mode: 'view' | 'edit' } | null>(null);
    const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);
    const [sortKey, setSortKey] = useState<'default' | 'title' | 'artist' | 'album' | 'date' | 'duration'>('default');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const toggleSort = (key: typeof sortKey) => {
        if (sortKey === key) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortOrder('asc');
        }
    };

    const sortedTracks = useMemo(() => {
        if (sortKey === 'default') return tracks;
        return [...tracks].sort((a, b) => {
            let valA: any = a[sortKey as keyof Track] || '';
            let valB: any = b[sortKey as keyof Track] || '';

            if (sortKey === 'duration') {
                valA = a.duration || 0;
                valB = b.duration || 0;
            } else if (sortKey === 'date') {
                // If we don't have a specific `date` property use `id` or string comparison 
                valA = a.date || a.id || '';
                valB = b.date || b.id || '';
            } else {
                valA = String(valA).toLowerCase();
                valB = String(valB).toLowerCase();
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [tracks, sortKey, sortOrder]);

    const handleClearLyricsCache = (track: Track) => {
        setLyricsModalStatus({ track, mode: 'edit' });
    };

    const handleShowLyrics = (track: Track) => {
        setLyricsModalStatus({ track, mode: 'view' });
    };

    const formatDuration = (seconds: number) => {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    if (tracks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center text-on-surface-variant">
                <p>No songs found.</p>
            </div>
        );
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedTracks = sortedTracks.slice(startIndex, startIndex + itemsPerPage);

    const handleAddTrackToPlaylist = async (playlistId: number, track: Track) => {
        setSelectedPlaylistId(playlistId);
        const success = await usePlaylistStore.getState().addTrackToPlaylist(playlistId, track.id as number);
        if (success) {
            // Toast logic will be handled globally if possible, or we could add a local toast here
            // But user said "toast should appear... saying song name - added to playlist name"
            // Let's assume we have a global toast method
            (window as any).showToast?.(`${track.title} - added to ${usePlaylistStore.getState().playlists.find(p => p.id === playlistId)?.name}`);
            setTimeout(() => setSelectedPlaylistId(null), 1500);
        }
    };

    return (
        <div className="w-full space-y-6 relative">
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_minmax(120px,1fr)_auto_auto] gap-4 px-4 py-3 border-b border-surface-variant/50 text-[10px] font-black uppercase tracking-[0.2em] sticky top-0 bg-background z-30 shadow-sm rounded-t-xl mx-1 text-on-surface-variant outline outline-1 outline-primary/20">
                <div className="w-8 text-center ml-2 bg-primary/5 outline outline-1 outline-primary/10 rounded-md py-1">#</div>
                <div onClick={() => toggleSort('title')} className="cursor-pointer hover:text-primary flex items-center gap-1 bg-primary/5 outline outline-1 outline-primary/10 rounded-md py-1 px-3 transition-colors">Title <ArrowUpDown size={12} className={clsx("transition-colors", sortKey === 'title' ? "text-primary" : "text-on-surface-variant/30")} /></div>
                <div onClick={() => toggleSort('artist')} className="hidden md:flex cursor-pointer hover:text-primary items-center gap-1 bg-primary/5 outline outline-1 outline-primary/10 rounded-md py-1 px-3 transition-colors">Artist <ArrowUpDown size={12} className={clsx("transition-colors", sortKey === 'artist' ? "text-primary" : "text-on-surface-variant/30")} /></div>
                <div onClick={() => toggleSort('album')} className="hidden lg:flex cursor-pointer hover:text-primary items-center gap-1 bg-primary/5 outline outline-1 outline-primary/10 rounded-md py-1 px-3 transition-colors">Album <ArrowUpDown size={12} className={clsx("transition-colors", sortKey === 'album' ? "text-primary" : "text-on-surface-variant/30")} /></div>
                <div className="hidden xl:block text-center bg-primary/5 outline outline-1 outline-primary/10 rounded-md py-1 mx-2">Lyrics</div>
                <div onClick={() => toggleSort('duration')} className="w-20 text-center bg-primary/5 outline outline-1 outline-primary/10 rounded-md py-1 cursor-pointer hover:text-primary flex items-center justify-center gap-1 transition-colors">Length <ArrowUpDown size={12} className={clsx("transition-colors", sortKey === 'duration' ? "text-primary" : "text-on-surface-variant/30")} /></div>
                <div className="w-32 text-center bg-primary/5 outline outline-1 outline-primary/10 rounded-md py-1">Actions</div>
            </div>

            <div className="divide-y divide-surface-variant/10">
                {paginatedTracks.map((track, index) => {
                    const id = String(track.id);
                    const isFav = isFavorite(id);
                    const globalIndex = startIndex + index + 1;
                    return (
                        <div
                            key={track.path + index}
                            className="group grid grid-cols-[auto_1fr_1fr_1fr_minmax(120px,1fr)_auto_auto] gap-4 px-4 py-3 items-center hover:bg-surface-variant/30 transition-all cursor-default rounded-2xl mx-1"
                        >
                            <div className="w-8 text-center text-on-surface-variant text-sm font-bold group-hover:hidden ml-2 opacity-40">
                                {globalIndex}
                            </div>
                            <div
                                className="w-8 justify-center hidden group-hover:flex cursor-pointer hover:scale-110 transition-transform ml-2 px-1"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onPlay(track);
                                }}
                            >
                                <Play size={16} className="text-primary fill-current" />
                            </div>

                            <div
                                className="flex items-center gap-3 overflow-hidden cursor-pointer"
                                onClick={() => onPlay(track)}
                            >
                                <div className="w-10 h-10 rounded-xl bg-surface-variant flex-shrink-0 flex items-center justify-center overflow-hidden shadow-sm group-hover:shadow-primary/20 transition-all">
                                    {track.image_path ? (
                                        <img
                                            src={track.image_path.startsWith('http') ? track.image_path : toAtmusicUrl(track.image_path)}
                                            className="w-full h-full object-cover"
                                            alt=""
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center text-primary/40 text-xs font-bold font-mono">
                                            TRK
                                        </div>
                                    )}
                                </div>
                                <div className="truncate">
                                    <div className="font-bold text-on-background truncate group-hover:text-primary transition-colors" title={track.title}>{track.title}</div>
                                    <div className="md:hidden text-xs text-on-surface-variant/60 font-medium truncate" title={track.artist}>{track.artist}</div>
                                </div>
                            </div>

                            <div
                                className="hidden md:block truncate text-on-surface-variant/80 font-medium hover:text-primary transition-colors cursor-pointer"
                                title={track.artist}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/artist/${encodeURIComponent(track.artist)}`);
                                }}
                            >
                                {track.artist}
                            </div>
                            <div
                                className="hidden lg:block truncate text-on-surface-variant/80 font-medium hover:text-primary transition-colors cursor-pointer"
                                title={track.album}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/album/${encodeURIComponent(track.album)}`);
                                }}
                            >
                                {track.album}
                            </div>

                            <div className="hidden xl:flex items-center justify-center gap-2 px-2">
                                <button
                                    className={clsx(
                                        "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all scale-90 w-full",
                                        track.hasLyrics ? "bg-primary/10 text-primary hover:bg-primary hover:text-on-primary" : "bg-surface-variant/30 text-on-surface-variant/50 hover:bg-surface-variant hover:text-on-surface-variant"
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleShowLyrics(track);
                                    }}
                                    title={track.hasLyrics ? "View Lyrics" : "No Lyrics Cached"}
                                >
                                    <AlignLeft size={12} /> {track.hasLyrics ? 'Yes' : 'No'}
                                </button>
                                <button
                                    className="p-1.5 rounded-full text-on-surface-variant/40 hover:text-primary hover:bg-primary/10 transition-all opacity-0 group-hover:opacity-100"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleClearLyricsCache(track);
                                    }}
                                    title="Re-Fetch Lyrics"
                                >
                                    <Edit2 size={12} />
                                </button>
                            </div>

                            <div className="w-16 text-center text-sm text-on-surface-variant font-bold tabular-nums">
                                {formatDuration(track.duration)}
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const id = String(track.id);
                                        if (isFav) removeFavorite(id);
                                        else addFavorite({ ...track, id, type: 'song' });
                                    }}
                                    className={clsx(
                                        "p-2 rounded-full transition-all duration-300 transform",
                                        isFav ? "text-primary scale-110 opacity-100" : "text-primary/70 hover:text-primary hover:bg-primary/10"
                                    )}
                                >
                                    <Heart size={18} fill={isFav ? "currentColor" : "none"} />
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingTrack(track);
                                    }}
                                    className="p-2 rounded-full text-primary/70 hover:text-primary hover:bg-primary/10 transition-all"
                                    title="Edit Metadata"
                                >
                                    <Edit2 size={16} />
                                </button>

                                {track.path && !track.path.startsWith('http') && (
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            const confirm = window.confirm(`Are you sure you want to delete "${track.title}" from your system storage? This will send it to the Recycle Bin/Trash.`);
                                            if (confirm && window.ipcRenderer) {
                                                const success = await window.ipcRenderer.invoke('shell:trashItem', track.path);
                                                if (success) {
                                                    // Trigger global UI refresh (DB -> Store -> UI)
                                                    const libraryStore = useLibraryStore.getState();
                                                    if ((window as any).refreshLibraryStore) {
                                                        await (window as any).refreshLibraryStore();
                                                    } else {
                                                        await libraryStore.refreshLibrary();
                                                    }

                                                    if ((window as any).refreshLibraryFromList) {
                                                        await (window as any).refreshLibraryFromList();
                                                    }
                                                }
                                            }
                                        }}
                                        className="p-2 rounded-full text-primary/70 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                        title="Delete File from Storage"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}

                                <div className="relative group/menu">
                                    {onRemove ? (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemove(track);
                                            }}
                                            className="p-2 rounded-full text-primary/70 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                            title="Remove from Playlist"
                                        >
                                            <Minus size={18} />
                                        </button>
                                    ) : (
                                        <>
                                            <button className="p-2 rounded-full text-primary/70 hover:text-primary hover:bg-primary/10 transition-all">
                                                <Plus size={18} />
                                            </button>
                                            <div className="absolute right-0 bottom-full mb-2 w-56 bg-surface border border-primary/20 rounded-[2rem] shadow-2xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-50 overflow-hidden divide-y divide-white/5 backdrop-blur-xl">
                                                <button
                                                    className="w-full text-left px-5 py-3 hover:bg-primary hover:text-on-primary text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-3"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        usePlayerStore.getState().addToQueue(track);
                                                        if (typeof window !== 'undefined' && 'showToast' in window) {
                                                            (window as any).showToast?.(`"${track.title}" added to queue`);
                                                        }
                                                    }}
                                                >
                                                    <Plus size={14} /> Add to Queue
                                                </button>
                                                <div className="px-5 py-2.5 text-[9px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] bg-white/5">Collect in Playlist</div>
                                                <div className="max-h-48 overflow-y-auto no-scrollbar">
                                                    {usePlaylistStore.getState().playlists.map(pl => (
                                                        <button
                                                            key={pl.id}
                                                            className={clsx(
                                                                "w-full text-left px-5 py-2.5 text-xs font-bold transition-all truncate flex items-center justify-between",
                                                                selectedPlaylistId === pl.id ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-white/5 hover:text-primary"
                                                            )}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleAddTrackToPlaylist(pl.id, track);
                                                            }}
                                                        >
                                                            {pl.name}
                                                            {selectedPlaylistId === pl.id && <Plus size={12} className="animate-pulse" />}
                                                        </button>
                                                    ))}
                                                </div>
                                                {usePlaylistStore.getState().playlists.length === 0 && (
                                                    <div className="px-5 py-4 text-xs text-on-surface-variant/40 italic">No playlists yet</div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Removed internal pagination */}

            {editingTrack && (
                <MetadataEditor track={editingTrack} onClose={() => setEditingTrack(null)} />
            )}
            {lyricsModalStatus && lyricsModalStatus.mode === 'view' && (
                <LibraryLyricsModal
                    track={lyricsModalStatus.track}
                    onClose={() => setLyricsModalStatus(null)}
                    onSearchRequest={() => setLyricsModalStatus({ track: lyricsModalStatus.track, mode: 'edit' })}
                />
            )}
            {lyricsModalStatus && lyricsModalStatus.mode === 'edit' && (
                <LyricsSearchModal
                    track={lyricsModalStatus.track}
                    onClose={() => setLyricsModalStatus(null)}
                    onFetched={() => setLyricsModalStatus({ track: lyricsModalStatus.track, mode: 'view' })}
                />
            )}
        </div>
    );
};

export default SongList;
