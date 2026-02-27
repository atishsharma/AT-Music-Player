
import { useRef, useEffect, useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { useThemeStore } from '../../store/themeStore';
import { useFavoritesStore } from '../../store/favoritesStore';
import { X, Mic2, ListMusic, Play, Heart, Plus, Music2, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { toAtmusicUrl } from '../../utils/path';

const QueueStepControls = ({ index, queue, reorderQueue, appearance }: any) => {
    const move = (e: React.MouseEvent, direction: 'up' | 'down') => {
        e.stopPropagation();
        const newQueue = [...queue];
        const item = newQueue[index];
        if (direction === 'up' && index > 0) {
            newQueue.splice(index, 1);
            newQueue.splice(index - 1, 0, item);
            reorderQueue(newQueue);
        } else if (direction === 'down' && index < queue.length - 1) {
            newQueue.splice(index, 1);
            newQueue.splice(index + 1, 0, item);
            reorderQueue(newQueue);
        }
    };

    return (
        <div className={clsx(
            "flex flex-col rounded-lg border overflow-hidden shrink-0",
            appearance === 'light' ? "bg-primary/5 border-primary/20" : "bg-white/5 border-white/10"
        )} onClick={e => e.stopPropagation()}>
            <button
                onClick={(e) => move(e, 'up')}
                className="p-1 px-1.5 hover:bg-primary/20 text-primary transition-colors disabled:opacity-30 disabled:pointer-events-none"
                disabled={index === 0}
            >
                <ChevronUp size={14} />
            </button>
            <div className={clsx("h-[1px] w-full", appearance === 'light' ? "bg-primary/20" : "bg-white/10")} />
            <button
                onClick={(e) => move(e, 'down')}
                className="p-1 px-1.5 hover:bg-primary/20 text-primary transition-colors disabled:opacity-30 disabled:pointer-events-none"
                disabled={index === queue.length - 1}
            >
                <ChevronDown size={14} />
            </button>
        </div>
    );
};

const SidebarQueueItem = ({ track, i, isFav, play, removeFromQueue, addFavorite, removeFavorite, appearance, queue, reorderQueue }: any) => {
    const [showPlaylistPopup, setShowPlaylistPopup] = useState(false);
    const [playlists, setPlaylists] = useState<any[]>([]);
    const playlistPopupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (playlistPopupRef.current && !playlistPopupRef.current.contains(event.target as Node)) {
                setShowPlaylistPopup(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={clsx("relative group/item outline-none p-3 rounded-xl flex items-center gap-4 transition-colors border border-transparent hover:border-primary/30 cursor-pointer", appearance === 'light' ? "bg-background hover:bg-primary/5" : "bg-black/20 hover:bg-primary/10")}
        >

            <QueueStepControls index={i} queue={queue} reorderQueue={reorderQueue} appearance={appearance} />

            <div className="w-12 h-12 rounded-xl overflow-hidden bg-surface-variant flex-shrink-0 relative shadow-sm cursor-pointer" onClick={() => { play(track); removeFromQueue(i); }}>
                {track.image_path || track.thumbnail ? (
                    <img src={track.image_path?.startsWith('http') ? track.image_path : track.image_path ? toAtmusicUrl(track.image_path) : track.thumbnail} className="w-full h-full object-cover" />
                ) : <Music2 size={16} className={clsx("absolute inset-0 m-auto", appearance === 'light' ? "text-primary/30" : "text-white/30")} />}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/item:opacity-100 flex items-center justify-center transition-opacity">
                    <Play size={16} className="text-white fill-current drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                </div>
            </div>
            <div className="flex-1 min-w-0 pointer-events-none">
                <h4 className={clsx("font-medium text-sm truncate transition-colors", appearance === 'light' ? "text-on-background group-hover/item:text-primary" : "text-on-surface group-hover/item:text-primary")}>{track.title}</h4>
                <p className={clsx("text-xs truncate transition-colors", appearance === 'light' ? "text-on-surface-variant group-hover/item:text-primary/70" : "text-on-surface-variant group-hover/item:text-primary/70")}>{track.artist}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 transition-opacity">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        const id = track.id?.toString() || track.id;
                        isFav ? removeFavorite(id) : addFavorite({ ...track, id, type: 'song' });
                    }}
                    className={clsx("p-2 rounded-full transition-colors", isFav ? "text-primary bg-primary/10" : "text-primary hover:bg-primary/20")}
                >
                    <Heart size={16} fill={isFav ? "currentColor" : "none"} />
                </button>
                <div className="relative" ref={playlistPopupRef}>
                    <button
                        onClick={async (e) => {
                            e.stopPropagation();
                            if (!showPlaylistPopup) {
                                const all = await window.ipcRenderer.invoke('playlist:getAll');
                                setPlaylists(all);
                            }
                            setShowPlaylistPopup(!showPlaylistPopup);
                        }}
                        className={clsx("p-2 rounded-full text-primary hover:bg-primary/20 transition-colors", showPlaylistPopup && "bg-primary/20")}
                    >
                        <Plus size={16} />
                    </button>
                    {showPlaylistPopup && (
                        <div className="absolute bottom-full right-0 mb-2 w-48 bg-primary rounded-xl shadow-2xl z-50 outline outline-1 outline-white/20 border border-white/10 overflow-hidden flex flex-col text-on-primary">
                            <div className="px-3 py-2 bg-black/10 border-b border-white/10 flex flex-col">
                                <h4 className="text-[8px] font-black uppercase tracking-widest text-on-primary/60">Add to Playlist</h4>
                            </div>
                            <div className="max-h-40 overflow-y-auto no-scrollbar flex flex-col p-1">
                                {playlists.length > 0 ? playlists.map((pl) => (
                                    <button
                                        key={pl.id}
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            if (track?.id) {
                                                await window.ipcRenderer.invoke('playlist:addTrack', { playlistId: pl.id, trackId: track.id });
                                                (window as any).showToast?.(`Added to ${pl.name}`);
                                            }
                                            setShowPlaylistPopup(false);
                                        }}
                                        className="text-left px-3 py-2 text-[10px] font-bold hover:bg-white hover:text-primary rounded-lg transition-all truncate"
                                    >
                                        {pl.name}
                                    </button>
                                )) : (
                                    <p className="text-[8px] text-on-primary/70 italic px-2 py-3 text-center">No playlists found</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); removeFromQueue(i); }}
                    className="p-2 rounded-full text-primary hover:bg-red-500/20 hover:text-red-500 transition-colors"
                >
                    <X size={16} />
                </button>
            </div>
        </motion.div>
    );
};

const SidebarOverlay = () => {
    const {
        isSidebarQueueOpen,
        isSidebarLyricsOpen,
        toggleSidebarQueue,
        toggleSidebarLyrics,
        lyrics,
        currentTrack,
        queue,
        currentTime,
        seek,
        play,
        removeFromQueue,
        reorderQueue,
        clearQueue
    } = usePlayerStore() as any;

    const { addFavorite, removeFavorite, isFavorite } = useFavoritesStore();
    const { appearance } = useThemeStore();

    const lyricsContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!Array.isArray(lyrics?.syncedLyrics) || !isSidebarLyricsOpen) return;

        const activeLineIndex = lyrics.syncedLyrics.findIndex((line: any, index: number) => {
            const nextLine = lyrics.syncedLyrics[index + 1];
            return currentTime >= line.seconds && (!nextLine || currentTime < nextLine.seconds);
        });

        if (activeLineIndex !== -1 && lyricsContainerRef.current) {
            const activeEl = lyricsContainerRef.current.children[activeLineIndex] as HTMLElement;
            if (activeEl) {
                activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [currentTime, lyrics, isSidebarLyricsOpen]);

    const isOpen = isSidebarQueueOpen || isSidebarLyricsOpen;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed top-0 right-0 h-[calc(100vh-6rem)] w-[26%] bg-surface/80 backdrop-blur-2xl border-l border-white/5 z-50 flex flex-col shadow-2xl outline outline-1 outline-primary outline-offset-[-1px]"
                >
                    <div className="flex items-center justify-between p-6 border-b border-white/5">
                        <div className="flex items-center gap-2">
                            {isSidebarLyricsOpen ? <Mic2 size={20} className="text-primary" /> : <ListMusic size={20} className="text-primary" />}
                            <h3 className="font-bold text-lg text-on-background">
                                {isSidebarLyricsOpen ? 'Lyrics' : 'Playing Queue'}
                            </h3>
                        </div>
                        <button
                            onClick={() => {
                                toggleSidebarQueue(false);
                                toggleSidebarLyrics(false);
                            }}
                            className="p-2 hover:bg-white/10 rounded-full text-on-surface-variant transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar p-6">
                        {isSidebarLyricsOpen ? (
                            <div className="flex flex-col h-full">
                                {lyrics ? (
                                    lyrics.isSynced ? (
                                        <div className="space-y-6 py-12 text-center" ref={lyricsContainerRef}>
                                            {lyrics.syncedLyrics.map((line: any, i: number) => {
                                                const isActive = currentTime >= line.seconds && (!lyrics.syncedLyrics[i + 1] || currentTime < lyrics.syncedLyrics[i + 1].seconds);
                                                return (
                                                    <p
                                                        key={i}
                                                        className={clsx(
                                                            "text-xl font-bold transition-all duration-500 cursor-pointer",
                                                            isActive ? "text-primary scale-110 opacity-100" : "text-on-surface-variant/30 hover:text-on-surface-variant/60"
                                                        )}
                                                        onClick={() => seek(line.seconds)}
                                                    >
                                                        {line.content}
                                                    </p>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="whitespace-pre-wrap text-lg font-bold text-on-surface-variant/60 leading-relaxed text-center">
                                            {lyrics.plainLyrics}
                                        </p>
                                    )
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant/20">
                                        <Mic2 size={40} className="mb-4" />
                                        <p className="font-black uppercase tracking-widest text-xs">No lyrics found</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Current */}
                                {currentTrack && (
                                    <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Now Playing</p>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-primary/20">
                                                {currentTrack.image_path || currentTrack.thumbnail ? (
                                                    <img src={currentTrack.image_path?.startsWith('http') ? currentTrack.image_path : currentTrack.image_path ? toAtmusicUrl(currentTrack.image_path) : currentTrack.thumbnail} className="w-full h-full object-cover" />
                                                ) : <div className="w-full h-full flex items-center justify-center"><ListMusic size={16} /></div>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold truncate text-on-background">{currentTrack.title}</h4>
                                                <p className="text-xs text-on-surface-variant truncate">{currentTrack.artist}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Up Next */}
                                <div className="pt-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Up Next</p>
                                        {queue && queue.length > 0 && (
                                            <button
                                                onClick={clearQueue}
                                                className={clsx("text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border transition-colors", appearance === 'light' ? "text-primary border-primary/20 hover:bg-primary hover:text-white" : "text-primary border-primary/30 hover:bg-primary/20")}
                                            >
                                                Clear Queue
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-2 pb-20">
                                        {queue && queue.length > 0 ? (
                                            queue.map((track: any, i: number) => {
                                                const id = track.id?.toString() || track.id;
                                                const isFav = isFavorite(id);
                                                return (
                                                    <SidebarQueueItem key={track.id + '-' + i} track={track} i={i} isFav={isFav} play={play} removeFromQueue={removeFromQueue} addFavorite={addFavorite} removeFavorite={removeFavorite} appearance={appearance} queue={queue} reorderQueue={reorderQueue} />
                                                )
                                            })
                                        ) : (
                                            <div className="py-12 text-center text-on-surface-variant/20 italic">
                                                Queue is empty
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SidebarOverlay;
