import { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Maximize2, Heart, Mic2, Pin, PinOff, Airplay, ListMusic, X, Music2 } from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore';
import { useFavoritesStore } from '../../store/favoritesStore';
import { useThemeStore } from '../../store/themeStore';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { toAtmusicUrl } from '../../utils/path';

const MiniPlayer = () => {
    const {
        currentTrack,
        isPlaying,
        play,
        pause,
        next,
        prev,
        currentTime,
        duration,
        seek,
        queue,
        removeFromQueue,
    } = usePlayerStore() as any;

    const { } = useThemeStore();
    const { addFavorite, removeFavorite, isFavorite } = useFavoritesStore();

    const [lyrics, setLyrics] = useState<any>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragValue, setDragValue] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(true);
    const [showQueue, setShowQueue] = useState(false);
    const lyricsRef = useRef<HTMLDivElement>(null);

    const isFav = currentTrack ? isFavorite(currentTrack.id?.toString() || currentTrack.id) : false;

    const handleFavToggle = () => {
        if (!currentTrack) return;
        if (isFav) removeFavorite(currentTrack.id?.toString() || currentTrack.id);
        else addFavorite({ ...currentTrack, id: currentTrack.id?.toString() || currentTrack.id, type: 'song' });
    };

    useEffect(() => {
        const fetchLyrics = async () => {
            if (!currentTrack) { setLyrics(null); return; }
            try {
                const data = await window.ipcRenderer.invoke('lyrics:get', {
                    artist: currentTrack.artist,
                    title: currentTrack.title,
                    album: currentTrack.album,
                    duration: currentTrack.duration
                });
                setLyrics(data);
            } catch {
                setLyrics(null);
            }
        };
        fetchLyrics();
    }, [currentTrack]);

    useEffect(() => {
        if (!lyrics?.syncedLyrics || !lyricsRef.current) return;
        const activeEl = lyricsRef.current.querySelector('[data-active="true"]');
        if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [currentTime, lyrics]);

    const exitMiniPlayer = async () => {
        try { await (window as any).windowControls.normalMode(); }
        catch (err) { console.error('Failed to exit mini player:', err); }
    };

    const formatTime = (s: number) => {
        if (!s || isNaN(s)) return '0:00';
        return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
    };

    const progress = duration ? ((isDragging ? dragValue : currentTime) / duration) * 100 : 0;

    const artUrl = currentTrack
        ? (currentTrack.image_path?.startsWith('http')
            ? currentTrack.image_path
            : currentTrack.image_path
                ? toAtmusicUrl(currentTrack.image_path)
                : currentTrack.thumbnail || '')
        : '';

    if (!currentTrack) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-background">
                <Music2 size={40} className="text-primary/20 mb-3" />
                <p className="text-xs text-on-surface-variant/40 font-bold uppercase tracking-widest">Nothing Playing</p>
                <button onClick={exitMiniPlayer} className="mt-5 px-4 py-2 bg-primary/10 text-primary rounded-full text-[10px] font-black hover:bg-primary/20 uppercase tracking-widest">
                    Open Full Player
                </button>
            </div>
        );
    }

    return (
        <div
            className="h-screen w-full flex flex-col bg-background overflow-hidden select-none relative"
            style={{ WebkitAppRegion: 'no-drag' } as any}
        >
            {/* Ambient background from album art */}
            {artUrl && (
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <img src={artUrl} className="w-full h-full object-cover blur-[60px] opacity-20 scale-110" alt="" />
                    <div className="absolute inset-0 bg-background/70" />
                </div>
            )}

            {/* ── HEADER ─────────────────────────────────────────── */}
            <div
                className="relative z-10 flex items-center justify-between px-4 pt-3 pb-2 shrink-0"
                style={{ WebkitAppRegion: 'drag' } as any}
            >
                {/* Left: Pin + Fav */}
                <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
                    <button
                        onClick={() => {
                            setIsAlwaysOnTop(!isAlwaysOnTop);
                            (window as any).windowControls.toggleAlwaysOnTop(!isAlwaysOnTop);
                        }}
                        className={clsx(
                            "p-1.5 rounded-full transition-all",
                            isAlwaysOnTop ? "text-primary" : "text-on-surface-variant/40 hover:text-primary"
                        )}
                        title={isAlwaysOnTop ? "Always on Top: On" : "Always on Top: Off"}
                    >
                        {isAlwaysOnTop ? <Pin size={14} /> : <PinOff size={14} />}
                    </button>
                    <button
                        onClick={handleFavToggle}
                        className={clsx(
                            "p-1.5 rounded-full transition-all",
                            isFav ? "text-primary" : "text-on-surface-variant/40 hover:text-primary"
                        )}
                    >
                        <Heart size={14} fill={isFav ? "currentColor" : "none"} />
                    </button>
                </div>

                <span className="text-[9px] font-black uppercase tracking-[0.35em] text-primary/40">Mini Player</span>

                {/* Right: Expand */}
                <button
                    onClick={exitMiniPlayer}
                    className="p-1.5 rounded-full text-on-surface-variant/40 hover:text-primary transition-all"
                    style={{ WebkitAppRegion: 'no-drag' } as any}
                >
                    <Maximize2 size={14} />
                </button>
            </div>

            {/* ── SQUARE ALBUM ART CARD (Flip for Lyrics) ─────────── */}
            <div className="relative z-10 w-full px-4 shrink-0">
                <div
                    className="w-full aspect-square cursor-pointer [perspective:1000px] group"
                    onClick={() => setIsFlipped(f => !f)}
                    style={{ WebkitAppRegion: 'no-drag' } as any}
                >
                    <motion.div
                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                        transition={{ duration: 0.65, type: 'spring', stiffness: 120, damping: 22 }}
                        className="w-full h-full relative [transform-style:preserve-3d]"
                    >
                        {/* FRONT – Album Art */}
                        <div className="absolute inset-0 [backface-visibility:hidden] rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-surface-variant/20">
                            {artUrl ? (
                                <img
                                    src={artUrl}
                                    alt={currentTrack.title}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-background">
                                    <Music2 size={64} className="text-primary/20" />
                                </div>
                            )}
                            {/* Hover hint */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="flex flex-col items-center gap-2">
                                    <Mic2 size={24} className="text-white/80" />
                                    <span className="text-white/70 text-[10px] font-black uppercase tracking-[0.25em]">Show Lyrics</span>
                                </div>
                            </div>
                        </div>

                        {/* BACK – Lyrics */}
                        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-3xl overflow-hidden shadow-2xl border border-primary/20 bg-background/95 backdrop-blur-2xl flex flex-col">
                            {/* Back hint top-right */}
                            <div
                                className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-primary/10 text-primary"
                                title="Tap to flip back"
                            >
                                <Mic2 size={12} />
                            </div>

                            {lyrics?.syncedLyrics ? (
                                <div ref={lyricsRef} className="flex-1 overflow-y-auto no-scrollbar px-5 py-8 space-y-4">
                                    {lyrics.syncedLyrics.map((line: any, i: number) => {
                                        const isActive =
                                            currentTime >= line.seconds &&
                                            (!lyrics.syncedLyrics[i + 1] || currentTime < lyrics.syncedLyrics[i + 1].seconds);
                                        return (
                                            <p
                                                key={i}
                                                data-active={isActive}
                                                onClick={(e) => { e.stopPropagation(); seek(line.seconds); }}
                                                className={clsx(
                                                    "text-[13px] font-bold leading-relaxed cursor-pointer text-center transition-all duration-300 px-3 py-2 rounded-2xl",
                                                    isActive
                                                        ? "text-primary scale-105 bg-primary/15 shadow-sm"
                                                        : "text-on-surface-variant/30 hover:text-on-surface-variant/70"
                                                )}
                                            >
                                                {line.content}
                                            </p>
                                        );
                                    })}
                                </div>
                            ) : lyrics?.plainLyrics ? (
                                <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-8">
                                    <p className="text-[12px] text-on-surface-variant/70 leading-loose whitespace-pre-wrap text-center">
                                        {lyrics.plainLyrics}
                                    </p>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                                    <Music2 size={28} className="text-primary/20" />
                                    <p className="text-[9px] text-on-surface-variant/30 font-black uppercase tracking-[0.3em]">No Lyrics Found</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* ── TRACK INFO ───────────────────────────────────────── */}
            <div className="relative z-10 w-full text-center px-5 pt-4 pb-1 shrink-0">
                <motion.h3
                    key={currentTrack.id + '-title'}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[15px] font-black text-on-surface truncate"
                >
                    {currentTrack.title}
                </motion.h3>
                <motion.p
                    key={currentTrack.id + '-artist'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] truncate mt-0.5"
                >
                    {currentTrack.artist}
                </motion.p>
            </div>

            {/* ── SCRUBBER ─────────────────────────────────────────── */}
            <div className="relative z-10 w-full px-5 pt-3 pb-1 shrink-0 group" style={{ WebkitAppRegion: 'no-drag' } as any}>
                <div className="relative h-5 flex items-center">
                    <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        value={isDragging ? dragValue : currentTime}
                        onChange={(e) => {
                            setDragValue(parseFloat(e.target.value));
                            if (!isDragging) setIsDragging(true);
                        }}
                        onMouseDown={() => setIsDragging(true)}
                        onMouseUp={(e) => {
                            setIsDragging(false);
                            seek(parseFloat((e.target as HTMLInputElement).value));
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    />
                    <div className="w-full h-[3px] bg-primary/15 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <motion.div
                        className="absolute h-3 w-3 bg-primary rounded-full shadow-lg border-2 border-background z-10 pointer-events-none"
                        style={{ left: `calc(${progress}% - 6px)` }}
                        animate={{ scale: isDragging ? 1.4 : 1 }}
                    />
                </div>
                <div className="flex justify-between text-[9px] font-black text-primary/30 mt-1 tabular-nums tracking-widest">
                    <span>{formatTime(isDragging ? dragValue : currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            {/* ── CONTROLS ─────────────────────────────────────────── */}
            <div className="relative z-10 w-full flex items-center justify-between px-4 py-3 shrink-0" style={{ WebkitAppRegion: 'no-drag' } as any}>
                {/* Queue */}
                <button
                    onClick={() => setShowQueue(s => !s)}
                    className={clsx(
                        "p-2 rounded-full transition-all",
                        showQueue ? "text-primary bg-primary/10" : "text-on-surface-variant/30 hover:text-primary hover:bg-primary/5"
                    )}
                >
                    <ListMusic size={17} />
                </button>

                {/* Transport */}
                <div className="flex items-center gap-3">
                    <button onClick={prev} className="p-2 text-on-surface-variant/70 hover:text-primary active:scale-90 transition-all">
                        <SkipBack size={22} fill="currentColor" />
                    </button>
                    <button
                        onClick={isPlaying ? pause : () => play()}
                        className="w-14 h-14 bg-primary text-on-primary rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 border border-primary/40"
                    >
                        {isPlaying
                            ? <Pause size={26} fill="currentColor" />
                            : <Play size={26} className="ml-1" fill="currentColor" />}
                    </button>
                    <button onClick={next} className="p-2 text-on-surface-variant/70 hover:text-primary active:scale-90 transition-all">
                        <SkipForward size={22} fill="currentColor" />
                    </button>
                </div>

                {/* Open full player */}
                <button
                    onClick={() => {
                        const state = usePlayerStore.getState();
                        if (!state.isPlayerOpen) state.togglePlayer();
                        exitMiniPlayer();
                    }}
                    className="p-2 text-on-surface-variant/30 hover:text-primary hover:bg-primary/5 rounded-full transition-all"
                >
                    <Airplay size={17} />
                </button>
            </div>

            {/* ── QUEUE OVERLAY ─────────────────────────────────────── */}
            <AnimatePresence>
                {showQueue && (
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                        className="absolute inset-x-0 bottom-0 z-[100] bg-background/95 backdrop-blur-2xl border-t border-primary/10 rounded-t-3xl flex flex-col"
                        style={{ maxHeight: '70%' }}
                    >
                        {/* Queue Header */}
                        <div className="flex items-center justify-between px-5 py-3 shrink-0">
                            <div className="flex items-center gap-2">
                                <ListMusic size={14} className="text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Up Next</span>
                            </div>
                            <button onClick={() => setShowQueue(false)} className="p-1.5 rounded-full hover:bg-primary/10 text-on-surface-variant transition-all">
                                <X size={14} />
                            </button>
                        </div>

                        {/* Now Playing row */}
                        {currentTrack && (
                            <div className="mx-3 mb-2 flex items-center gap-3 px-3 py-2 rounded-2xl bg-primary/15 border border-primary/20 shrink-0">
                                <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 bg-surface-variant/30 flex items-center justify-center relative">
                                    {artUrl ? <img src={artUrl} className="w-full h-full object-cover" alt="" /> : <Music2 size={14} className="text-primary/40" />}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-black truncate text-primary">{currentTrack.title}</p>
                                    <p className="text-[9px] text-primary/50 truncate uppercase tracking-widest">{currentTrack.artist}</p>
                                </div>
                                <span className="text-[8px] font-black uppercase tracking-widest text-primary/50 px-2">Now</span>
                            </div>
                        )}

                        {/* Queue list */}
                        <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-4 space-y-1">
                            {queue && queue.length > 0 ? (
                                queue.map((track: any, i: number) => (
                                    <div
                                        key={track.id + '-' + i}
                                        onClick={() => { play(track); removeFromQueue(i); setShowQueue(false); }}
                                        className="flex items-center gap-3 px-3 py-2 rounded-2xl hover:bg-primary/10 transition-all cursor-pointer group"
                                    >
                                        <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 bg-surface-variant/30 flex items-center justify-center relative">
                                            {(track.image_path || track.thumbnail) ? (
                                                <img
                                                    src={(track.image_path || track.thumbnail).startsWith('http')
                                                        ? (track.image_path || track.thumbnail)
                                                        : toAtmusicUrl(track.image_path || track.thumbnail)}
                                                    className="w-full h-full object-cover"
                                                    alt=""
                                                />
                                            ) : <Music2 size={14} className="text-primary/30" />}
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <Play size={12} className="text-white fill-current" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold truncate group-hover:text-primary transition-colors">{track.title}</p>
                                            <p className="text-[9px] text-on-surface-variant truncate uppercase tracking-widest">{track.artist}</p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeFromQueue(i); }}
                                            className="p-1.5 text-on-surface-variant/20 hover:text-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 text-on-surface-variant/30">
                                    <ListMusic size={28} className="mb-2 opacity-40" />
                                    <p className="text-[9px] font-black uppercase tracking-[0.3em]">Queue Empty</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MiniPlayer;
