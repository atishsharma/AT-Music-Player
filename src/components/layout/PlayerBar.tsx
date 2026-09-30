
import { useState, useRef, useEffect } from 'react';
import { Play, SkipBack, SkipForward, Repeat, Shuffle, Volume2, VolumeX, Pause, ChevronUp, Maximize2, ListMusic, Mic2, Heart, Plus, PictureInPicture2, SlidersHorizontal, MonitorPlay, Radio } from 'lucide-react';
import { useRadioStore } from '../../store/radioStore';
import { useAmbientStore } from '../../store/ambientStore';
import { usePlayerStore } from '../../store/playerStore';
import { useShallow } from 'zustand/react/shallow';
import { useThemeStore } from '../../store/themeStore';
import { useFavoritesStore } from '../../store/favoritesStore';
import { useEqualizerStore } from '../../store/equalizerStore';
import clsx from 'clsx';
import { toAtmusicUrl } from '../../utils/path';
import type { PlaylistSummary } from '../../types/library';
import Equalizer from '../common/Equalizer';
import { usePlaylistStore } from '../../store/playlistStore';
import SingAlongButton from '../singalong/SingAlongButton';

const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Isolated so only the seek bar re-renders on playback time updates, not the whole bar
const SeekBar = ({ isLight }: { isLight: boolean }) => {
    const currentTime = usePlayerStore(s => s.currentTime);
    const duration = usePlayerStore(s => s.duration);
    const seek = usePlayerStore(s => s.seek);
    const [isDraggingSeek, setIsDraggingSeek] = useState(false);
    const [seekValue, setSeekValue] = useState(0);
    const shown = isDraggingSeek ? seekValue : currentTime;
    const pct = (shown / (duration || 1)) * 100;

    const commit = (value: string) => {
        setIsDraggingSeek(false);
        seek(parseFloat(value));
    };

    return (
        <div className={clsx("w-full flex items-center gap-4 text-[10px] font-black tracking-tighter tabular-nums", isLight ? "text-on-primary/70" : "text-on-surface-variant/60")}>
            <span className="w-10 text-right">{formatTime(shown)}</span>
            <div className="relative flex-1 h-6 flex items-center group cursor-pointer">
                <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    value={shown}
                    onChange={(e) => {
                        setSeekValue(parseFloat(e.target.value));
                        if (!isDraggingSeek) setIsDraggingSeek(true);
                    }}
                    onPointerDown={() => setIsDraggingSeek(true)}
                    onPointerUp={(e) => commit((e.target as HTMLInputElement).value)}
                    onKeyUp={(e) => commit((e.target as HTMLInputElement).value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />
                <div className={clsx("w-full h-1.5 rounded-full overflow-hidden", isLight ? "bg-black/10" : "bg-surface-variant")}>
                    {/* transform instead of width: composited, no layout per tick */}
                    <div
                        className={clsx(
                            "h-full w-full origin-left will-change-transform",
                            !isDraggingSeek && "transition-transform duration-300 ease-linear",
                            isLight ? "bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "bg-primary shadow-[0_0_10px_rgba(var(--md-sys-color-primary),0.5)]"
                        )}
                        style={{ transform: `scaleX(${Math.min(pct, 100) / 100})` }}
                    />
                </div>
                <div
                    className={clsx(
                        "absolute h-4 w-4 rounded-full shadow-lg transition-[transform] duration-200 pointer-events-none z-10 border",
                        isLight ? "bg-white border-primary/20" : "bg-primary border-on-primary/20",
                        isDraggingSeek ? "scale-[1.7]" : "group-hover:scale-125 scale-100"
                    )}
                    style={{ left: `calc(${Math.min(pct, 100)}% - 8px)` }}
                />
            </div>
            <span className="w-10">{formatTime(duration)}</span>
        </div>
    );
};

/** Smart Radio: start a station from the current song, or stop the running one */
const RadioButton = ({ isLight }: { isLight: boolean }) => {
    const active = useRadioStore(s => s.active);
    const loading = useRadioStore(s => s.loading);
    const seed = useRadioStore(s => s.seedTitle);
    return (
        <button
            onClick={() => (active ? useRadioStore.getState().stop() : useRadioStore.getState().start())}
            className={clsx(
                "p-2 rounded-full transition-all relative",
                active
                    ? (isLight ? "bg-white text-primary" : "bg-primary text-on-primary")
                    : (isLight ? "text-on-primary/70 hover:bg-black/5" : "text-on-surface-variant hover:bg-white/5")
            )}
            title={active ? `Radio from “${seed}” (click to stop)` : 'Start radio from this song'}
        >
            <Radio size={18} className={clsx(loading && "animate-pulse")} />
        </button>
    );
};

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
        volume,
        setVolume,
        isMuted,
        toggleMute,
        togglePlayer,
        toggleSidebarQueue,
        toggleSidebarLyrics,
        isSidebarQueueOpen,
        isSidebarLyricsOpen
    } = usePlayerStore(useShallow(s => ({
        currentTrack: s.currentTrack,
        isPlaying: s.isPlaying,
        play: s.play,
        pause: s.pause,
        next: s.next,
        prev: s.prev,
        toggleLoop: s.toggleLoop,
        toggleShuffle: s.toggleShuffle,
        loop: s.loop,
        shuffle: s.shuffle,
        volume: s.volume,
        setVolume: s.setVolume,
        isMuted: s.isMuted,
        toggleMute: s.toggleMute,
        togglePlayer: s.togglePlayer,
        toggleSidebarQueue: s.toggleSidebarQueue,
        toggleSidebarLyrics: s.toggleSidebarLyrics,
        isSidebarQueueOpen: s.isSidebarQueueOpen,
        isSidebarLyricsOpen: s.isSidebarLyricsOpen,
    })));

    const appearance = useThemeStore(s => s.appearance);
    const liquidGlass = useThemeStore(s => s.liquidGlass);
    const { isOpen: isEqOpen, toggleOpen: toggleEq, setOpen: setEqOpen, enabled: isEqEnabled } = useEqualizerStore();

    const { addFavorite, removeFavorite, isFavorite } = useFavoritesStore();
    const [showPlaylistPopup, setShowPlaylistPopup] = useState(false);
    const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
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

    const isFav = currentTrack ? isFavorite(String(currentTrack.id)) : false;

    const handleFavToggle = () => {
        if (!currentTrack) return;
        if (isFav) removeFavorite(String(currentTrack.id));
        else addFavorite({ ...currentTrack, id: String(currentTrack.id), type: 'song' });
    };

    const truncateTitle = (text: string, limit: number = 40) => {
        if (!text || text.length <= limit) return text;
        const sub = text.substring(0, limit);
        const lastSpace = sub.lastIndexOf(' ');
        if (lastSpace > 0) return sub.substring(0, lastSpace) + '...';
        return sub + '...';
    };

    if (!currentTrack) {
        return (
            <div className={clsx(
                "h-24 flex items-center justify-center font-bold uppercase tracking-widest text-xs",
                liquidGlass
                    ? "lg-panel lg-blur rounded-[28px] mx-3 mb-3 h-16 text-on-surface-variant"
                    : clsx("border-t", appearance === 'light' ? "bg-primary/10 text-primary border-primary/20" : "bg-surface text-on-surface-variant border-white/5")
            )}>
                Select a song to play
            </div>
        );
    }

    // The solid primary "light" bar doesn't apply to glass: glass uses theme ink on a translucent capsule
    const isLight = appearance === 'light' && !liquidGlass;

    return (
        <div className={clsx(
            "h-24 flex items-center px-6 gap-6 justify-between transition-all duration-300 relative z-[70]",
            liquidGlass
                // Floating capsule: blurs the page scrolling beneath it
                ? "lg-panel lg-strong lg-blur lg-sheen rounded-[32px] mx-3 mb-3 text-on-background"
                : clsx("backdrop-blur-xl border-t", isLight ? "bg-primary text-on-primary border-primary/20 shadow-[-10px_-10px_30px_rgba(var(--md-sys-color-primary),0.2)]" : "bg-surface/80 border-white/5 text-on-background")
        )}>
            {/* Track Info */}
            <div className="flex items-center gap-4 flex-1 min-w-[180px] max-w-[25%]">
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
                        <div className="w-full h-full bg-gradient-to-br from-primary to-primary" />
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
            <div className="flex flex-col items-center gap-2 flex-[2] min-w-0 max-w-2xl px-2">
                <div className="flex items-center gap-3 xl:gap-6">
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

                    <button onClick={() => prev()} className={clsx(
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

                    <button onClick={() => next()} className={clsx(
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
                                                    const ok = await usePlaylistStore.getState().addTrackToPlaylist(pl.id, currentTrack);
                                                    window.showToast?.(ok ? `${currentTrack.title} added to ${pl.name}` : `Couldn't add to ${pl.name} (already there?)`);
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

                <SeekBar isLight={isLight} />
            </div>

            {/* Right Side Tools */}
            <div className="shrink-0 flex justify-end items-center gap-2 xl:gap-4">
                <RadioButton isLight={isLight} />
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

                <SingAlongButton isLight={isLight} />

                {/* EQ Button */}
                <div className="relative">
                    <button
                        onClick={toggleEq}
                        className={clsx(
                            "p-2 rounded-full transition-all hover:scale-110",
                            isEqOpen || isEqEnabled
                                ? (isLight ? "bg-white text-primary" : "bg-primary text-on-primary")
                                : (isLight ? "text-on-primary/70 hover:bg-black/5" : "text-on-surface-variant hover:bg-white/5")
                        )}
                        title="Equalizer"
                    >
                        <SlidersHorizontal size={18} />
                    </button>
                    <Equalizer
                        isOpen={isEqOpen}
                        onClose={() => setEqOpen(false)}
                        anchor="bottom"
                        align="right"
                    />
                </div>

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
                                // Glass theme paints this bar in the primary colour, so the fill uses ink there
                                className={clsx("h-full transition-all duration-100 ease-out", isLight ? "bg-white" : appearance === 'glass' && !liquidGlass ? "bg-on-background" : "bg-primary")}
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
                    onClick={() => useAmbientStore.getState().open()}
                    className={clsx(
                        "p-3 rounded-xl transition-all",
                        isLight ? "bg-black/5 hover:bg-white text-on-primary hover:text-primary" : "bg-primary/10 hover:bg-primary text-primary hover:text-on-primary"
                    )}
                    title="Ambient Mode"
                >
                    <MonitorPlay size={20} />
                </button>
                <button
                    onClick={async () => {
                        try {
                            await window.windowControls.miniPlayer();
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
