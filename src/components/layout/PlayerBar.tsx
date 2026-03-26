
import { useState, useRef, useEffect } from 'react';
import { Play, SkipBack, SkipForward, Repeat, Shuffle, Volume2, VolumeX, Pause, ChevronUp, Maximize2, ListMusic, Mic2, Heart, Plus, PictureInPicture2 } from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore';
import { useThemeStore } from '../../store/themeStore';
import { useFavoritesStore } from '../../store/favoritesStore';
import clsx from 'clsx';
import { toAtmusicUrl } from '../../utils/path';

const PlayerBar = () => {
    const {
        currentTrack,
        isPlaying,
        play,
        pause,
        next,
        prev,
        toggleLoop,
        toggleShuffle,
        loop,
        shuffle,
        currentTime,
        duration,
        seek,
        volume,
        setVolume,
        isMuted,
        toggleMute,
        togglePlayer,
        toggleSidebarQueue,
        toggleSidebarLyrics,
        isSidebarQueueOpen,
        isSidebarLyricsOpen
    } = usePlayerStore() as any;

    const { appearance } = useThemeStore();

    const [isDraggingSeek, setIsDraggingSeek] = useState(false);
    const [seekValue, setSeekValue] = useState(0);

    const { addFavorite, removeFavorite, isFavorite } = useFavoritesStore();
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

    const isFav = currentTrack ? isFavorite(currentTrack.id?.toString() || currentTrack.id) : false;

    const handleFavToggle = () => {
        if (!currentTrack) return;
        if (isFav) removeFavorite(currentTrack.id?.toString() || currentTrack.id);
        else addFavorite({ ...currentTrack, id: currentTrack.id?.toString() || currentTrack.id, type: 'song' });
    };

    const truncateTitle = (text: string, limit: number = 40) => {
        if (!text || text.length <= limit) return text;
        const sub = text.substring(0, limit);
        const lastSpace = sub.lastIndexOf(' ');
        if (lastSpace > 0) return sub.substring(0, lastSpace) + '...';
        return sub + '...';
    };

    const formatTime = (seconds: number) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!currentTrack) {
        return (
            <div className={clsx(
                "h-24 border-t flex items-center justify-center font-bold uppercase tracking-widest text-xs",
                appearance === 'light' ? "bg-primary/10 text-primary border-primary/20" : "bg-surface text-on-surface-variant border-white/5"
            )}>
                Select a song to play
            </div>
        );
    }

    const isLight = appearance === 'light';

    return (
        <div className={clsx(
            "h-24 backdrop-blur-xl border-t flex items-center px-6 gap-6 justify-between transition-all duration-300 relative z-[70]",
            isLight ? "bg-primary text-on-primary border-primary/20 shadow-[-10px_-10px_30px_rgba(var(--md-sys-color-primary),0.2)]" : "bg-surface/80 border-white/5 text-on-background"
        )}>
            {/* Track Info */}
            <div className="flex items-center gap-4 w-[25%] min-w-[200px]">
                <div
                    className={clsx(
                        "w-14 h-14 rounded-xl overflow-hidden shadow-lg border cursor-pointer group relative",
                        isLight ? "border-on-primary/20 bg-primary-container" : "border-white/5 bg-surface-variant"
                    )}
                    onClick={togglePlayer}
                >
                    {currentTrack.image_path || currentTrack.thumbnail ? (
                        <img
                            src={currentTrack.image_path?.startsWith('http')
                                ? currentTrack.image_path
                                : currentTrack.image_path
                                    ? toAtmusicUrl(currentTrack.image_path)
                                    : currentTrack.thumbnail}
                            alt="Art"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary to-secondary" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <ChevronUp size={20} className="text-white" />
                    </div>
                </div>
                <div className="overflow-hidden">
                    <h4 className={clsx("font-bold truncate text-sm", isLight ? "text-on-primary" : "text-on-background")} title={currentTrack.title}>{truncateTitle(currentTrack.title)}</h4>
                    <p className={clsx("text-xs truncate font-medium", isLight ? "text-on-primary/70" : "text-on-surface-variant")}>{currentTrack.artist}</p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center gap-2 flex-1 max-w-2xl px-4">
                <div className="flex items-center gap-6">
                    <button
                        onClick={handleFavToggle}
                        className={clsx("p-2 rounded-full transition-all hover:scale-110", isFav ? (isLight ? "text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "text-primary shadow-[0_0_10px_rgba(var(--md-sys-color-primary),0.5)]") : (isLight ? "text-on-primary/60 hover:text-white" : "text-on-surface-variant/40 hover:text-on-surface-variant hover:bg-white/5"))}
                        title="Favorite"
                    >
                        <Heart size={18} fill={isFav ? "currentColor" : "none"} />
                    </button>

                    <button
                        onClick={toggleShuffle}
                        className={clsx(
                            "p-2 rounded-full transition-all",
                            shuffle
                                ? (isLight ? "text-white scale-110 bg-white/20" : "text-primary scale-110")
                                : (isLight ? "text-on-primary/60 hover:text-white hover:bg-white/10" : "text-on-surface-variant/40 hover:text-on-surface-variant hover:bg-white/5")
                        )}
                        title="Shuffle"
                    >
                        <Shuffle size={18} />
                    </button>

                    <button onClick={prev} className={clsx(
                        "transition-all hover:scale-110",
                        isLight ? "text-on-primary hover:text-white" : "text-on-background hover:text-primary"
                    )}>
                        <SkipBack size={22} fill="currentColor" />
                    </button>

                    <button
                        onClick={isPlaying ? pause : () => play()}
                        className={clsx(
                            "w-12 h-12 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg",
                            isLight ? "bg-white text-primary shadow-black/10" : "bg-primary text-on-primary shadow-primary/20"
                        )}
                    >
                        {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                    </button>

                    <button onClick={next} className={clsx(
                        "transition-all hover:scale-110",
                        isLight ? "text-on-primary hover:text-white" : "text-on-background hover:text-primary"
                    )}>
                        <SkipForward size={22} fill="currentColor" />
                    </button>

                    <button
                        onClick={toggleLoop}
                        className={clsx(
                            "p-2 rounded-full transition-all relative",
                            loop !== 'none'
                                ? (isLight ? "text-white scale-110 bg-white/20" : "text-primary scale-110")
                                : (isLight ? "text-on-primary/60 hover:text-white hover:bg-white/10" : "text-on-surface-variant/40 hover:text-on-surface-variant hover:bg-white/5")
                        )}
                        title="Repeat"
                    >
                        <Repeat size={18} />
                        {loop === 'one' && <span className={clsx(
                            "absolute -top-1 -right-1 text-[8px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center border",
                            isLight ? "bg-white text-primary border-primary" : "bg-primary text-on-primary border-surface"
                        )}>1</span>}
                    </button>

                    <div className="relative" ref={playlistPopupRef}>
                        <button
                            onClick={async () => {
                                if (!showPlaylistPopup) {
                                    const all = await window.ipcRenderer.invoke('playlist:getAll');
                                    setPlaylists(all);
                                }
                                setShowPlaylistPopup(!showPlaylistPopup);
                            }}
                            className={clsx("p-2 rounded-full transition-all hover:scale-110", showPlaylistPopup ? (isLight ? "text-white bg-white/20 shadow-[0_0_10px_rgba(255,255,255,0.3)]" : "text-primary bg-primary/10 shadow-[0_0_10px_rgba(var(--md-sys-color-primary),0.3)]") : (isLight ? "text-on-primary/60 hover:text-white" : "text-on-surface-variant/40 hover:text-on-surface-variant hover:bg-white/5"))}
                            title="Add to Playlist"
                        >
                            <Plus size={18} />
                        </button>
                        {showPlaylistPopup && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-56 bg-primary rounded-2xl shadow-[0_10px_40px_rgba(var(--md-sys-color-primary),0.5)] z-[100] outline outline-1 outline-white/20 border-2 border-white/10 overflow-hidden flex flex-col text-on-primary">
                                <div className="px-4 py-3 bg-black/10 border-b border-white/10 flex flex-col items-center">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-on-primary">Playlists</h4>
                                </div>
                                <div className="max-h-60 overflow-y-auto no-scrollbar flex flex-col p-2 space-y-1">
                                    {playlists.length > 0 ? playlists.map((pl) => (
                                        <button
                                            key={pl.id}
                                            onClick={async () => {
                                                if (currentTrack?.id) {
                                                    await window.ipcRenderer.invoke('playlist:addTrack', { playlistId: pl.id, trackId: currentTrack.id });
                                                }
                                                setShowPlaylistPopup(false);
                                            }}
                                            className="text-left px-3 py-2.5 text-xs font-bold hover:bg-white hover:text-primary rounded-xl transition-all truncate border border-transparent"
                                        >
                                            {pl.name}
                                        </button>
                                    )) : (
                                        <p className="text-[10px] text-on-primary/70 italic px-2 py-4 text-center">No playlists found</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Android-Style Seek Bar */}
                <div className={clsx("w-full flex items-center gap-4 text-[10px] font-black tracking-tighter", isLight ? "text-on-primary/70" : "text-on-surface-variant/60")}>
                    <span className="w-10 text-right">{formatTime(isDraggingSeek ? seekValue : currentTime)}</span>
                    <div className="relative flex-1 h-6 flex items-center group cursor-pointer">
                        <input
                            type="range"
                            min={0}
                            max={duration || 100}
                            value={isDraggingSeek ? seekValue : currentTime}
                            onChange={(e) => {
                                setSeekValue(parseFloat(e.target.value));
                                if (!isDraggingSeek) setIsDraggingSeek(true);
                            }}
                            onMouseDown={() => setIsDraggingSeek(true)}
                            onMouseUp={(e) => {
                                setIsDraggingSeek(false);
                                seek(parseFloat((e.target as HTMLInputElement).value));
                            }}
                            onTouchStart={() => setIsDraggingSeek(true)}
                            onTouchEnd={(e) => {
                                setIsDraggingSeek(false);
                                seek(parseFloat((e.target as HTMLInputElement).value));
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                        />
                        {/* Android Track */}
                        <div className={clsx("w-full h-1.5 rounded-full overflow-hidden", isLight ? "bg-black/10" : "bg-surface-variant")}>
                            <div
                                className={clsx(
                                    "h-full transition-all duration-100 ease-linear",
                                    isLight ? "bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "bg-primary shadow-[0_0_10px_rgba(var(--md-sys-color-primary),0.5)]"
                                )}
                                style={{ width: `${((isDraggingSeek ? seekValue : currentTime) / (duration || 1)) * 100}%` }}
                            />
                        </div>
                        {/* Android Thumb */}
                        <div
                            className={clsx(
                                "absolute h-4 w-4 rounded-full shadow-lg transition-all duration-200 pointer-events-none z-10 border",
                                isLight ? "bg-white border-primary/20" : "bg-primary border-on-primary/20",
                                isDraggingSeek ? "scale-[1.7]" : "group-hover:scale-125 scale-100"
                            )}
                            style={{ left: `calc(${((isDraggingSeek ? seekValue : currentTime) / (duration || 1)) * 100}% - 8px)` }}
                        />
                    </div>
                    <span className="w-10">{formatTime(duration)}</span>
                </div>
            </div>

            {/* Right Side Tools */}
            <div className="w-[25%] flex justify-end items-center gap-4">
                <button
                    onClick={() => toggleSidebarLyrics()}
                    className={clsx(
                        "p-2 rounded-full transition-all",
                        isSidebarLyricsOpen
                            ? (isLight ? "bg-white text-primary" : "bg-primary text-on-primary")
                            : (isLight ? "text-on-primary/70 hover:bg-black/5" : "text-on-surface-variant hover:bg-white/5")
                    )}
                    title="Lyrics"
                >
                    <Mic2 size={18} />
                </button>
                <button
                    onClick={() => toggleSidebarQueue()}
                    className={clsx(
                        "p-2 rounded-full transition-all",
                        isSidebarQueueOpen
                            ? (isLight ? "bg-white text-primary" : "bg-primary text-on-primary")
                            : (isLight ? "text-on-primary/70 hover:bg-black/5" : "text-on-surface-variant hover:bg-white/5")
                    )}
                    title="Queue"
                >
                    <ListMusic size={20} />
                </button>

                <div className={clsx("h-4 w-px mx-1", isLight ? "bg-black/10" : "bg-white/10")} />

                {/* Android-Style Volume */}
                <div className={clsx(
                    "flex items-center gap-3 group rounded-full pl-3 pr-4 py-1.5 border backdrop-blur-sm transition-all",
                    isLight ? "bg-black/5 border-black/5 hover:bg-black/10" : "bg-surface-variant/10 border-white/5 hover:bg-surface-variant/20"
                )}>
                    <button onClick={toggleMute} className={clsx("hover:scale-110 transition-transform", isLight ? "text-white" : "text-primary")}>
                        {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    <div className="relative w-24 h-6 flex items-center">
                        <input
                            type="range"
                            min={0} max={1} step={0.01}
                            value={volume}
                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className={clsx("w-full h-1.5 rounded-full overflow-hidden", isLight ? "bg-black/10" : "bg-white/10")}>
                            <div
                                className="h-full transition-all duration-100 ease-out bg-primary"
                                style={{ width: `${volume * 100}%` }}
                            />
                        </div>
                        <div
                            className="h-3 w-3 bg-white rounded-full absolute pointer-events-none shadow-sm transition-all duration-100 ease-out"
                            style={{ left: `calc(${volume * 100}% - 6px)` }}
                        />
                    </div>
                </div>

                <button
                    onClick={async () => {
                        try {
                            await (window as any).windowControls.miniPlayer();
                        } catch (err) {
                            console.error('Failed to switch to mini player:', err);
                        }
                    }}
                    className={clsx(
                        "p-3 rounded-xl transition-all",
                        isLight ? "bg-black/5 hover:bg-white text-on-primary hover:text-primary" : "bg-primary/10 hover:bg-primary text-primary hover:text-on-primary"
                    )}
                    title="Mini Player"
                >
                    <PictureInPicture2 size={20} />
                </button>
                <button
                    onClick={() => usePlayerStore.getState().togglePlayer()}
                    className={clsx(
                        "p-3 rounded-xl transition-all",
                        isLight ? "bg-black/5 hover:bg-white text-on-primary hover:text-primary" : "bg-primary/10 hover:bg-primary text-primary hover:text-on-primary"
                    )}
                    title="Zen Mode"
                >
                    <Maximize2 size={20} />
                </button>
            </div>
        </div>
    );
};

export default PlayerBar;
