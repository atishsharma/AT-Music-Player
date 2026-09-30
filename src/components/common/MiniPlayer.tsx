import { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Maximize2, Heart, Mic2, Pin, PinOff, Airplay, ListMusic, X, Music2, Shuffle, Repeat, Volume1, Volume2, VolumeX, SlidersHorizontal } from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore';
import { useThemeStore } from '../../store/themeStore';
import { useActiveLyricIndex } from '../../hooks/useActiveLyricIndex';
import { useFavoritesStore } from '../../store/favoritesStore';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { toAtmusicUrl } from '../../utils/path';
import { useEqualizerStore } from '../../store/equalizerStore';
import Equalizer from './Equalizer';

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
        shuffle,
        toggleShuffle,
        loop,
        toggleLoop,
        volume,
        setVolume,
        toggleMute,
        isMuted
    } = usePlayerStore() as any;

    const { addFavorite, removeFavorite, isFavorite } = useFavoritesStore();
    const liquidGlass = useThemeStore(s => s.liquidGlass);
    // Pick the Liquid Glass class set or the original outlined style
    const g = (glass: string, classic: string) => (liquidGlass ? glass : classic);
    // Round glass icon button used across the header/transport
    const glassBtn = 'lg-panel lg-press text-on-background hover:text-primary';

    const [lyrics, setLyrics] = useState<any>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragValue, setDragValue] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(true);
    const [showQueue, setShowQueue] = useState(false);
    const isEqOpen = useEqualizerStore(state => state.isOpen);
    const isEqEnabled = useEqualizerStore(state => state.enabled);
    const toggleEq = useEqualizerStore(state => state.toggleOpen);
    const setEqOpen = useEqualizerStore(state => state.setOpen);
    const lyricsRef = useRef<HTMLDivElement>(null);

    const isFav = currentTrack ? isFavorite(currentTrack.id?.toString() || currentTrack.id) : false;

    const handleFavToggle = () => {
        if (!currentTrack) return;
        if (isFav) removeFavorite(currentTrack.id?.toString() || currentTrack.id);
        else addFavorite({ ...currentTrack, id: currentTrack.id?.toString() || currentTrack.id, type: 'song' });
    };

    useEffect(() => {
        let cancelled = false;
        setLyrics(null);
        if (!currentTrack) return;
        window.ipcRenderer.invoke('lyrics:get', {
            artist: currentTrack.artist,
            title: currentTrack.title,
            album: currentTrack.album,
            duration: currentTrack.duration
        })
            .then((data) => { if (!cancelled) setLyrics(data); })
            .catch(() => { /* no lyrics */ });
        // Ignore late responses for tracks that were skipped
        return () => { cancelled = true; };
    }, [currentTrack]);

    const activeLineIndex = useActiveLyricIndex(lyrics?.syncedLyrics);
    // Scroll once per line change (was on every timeupdate)
    useEffect(() => {
        if (activeLineIndex === -1 || !lyricsRef.current) return;
        const activeEl = lyricsRef.current.querySelector('[data-active="true"]');
        if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [activeLineIndex]);

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

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();

    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let active = true;

        const checkAnalyserAndDraw = () => {
            if (!active) return;
            // Don't burn a 60fps loop drawing silence while paused
            if (!isPlaying) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                return;
            }
            const analyser = (window as any)._audioAnalyser;
            
            if (!analyser) {
                // Poll every 100ms if not found
                setTimeout(checkAnalyserAndDraw, 100);
                return;
            }

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const draw = () => {
                if (!active) return;
                animationRef.current = requestAnimationFrame(draw);
                analyser.getByteTimeDomainData(dataArray);

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                const time = Date.now() / 1000;
                const hue = (time * 20) % 360;

                ctx.lineWidth = 3;
                ctx.beginPath();
                const sliceWidth = canvas.width * 1.0 / bufferLength;
                let x = 0;
                const baseY = canvas.height * 0.8;

                for (let i = 0; i < bufferLength; i++) {
                    const v = dataArray[i] / 128.0;
                    const y = v * (canvas.height * 0.4) + (baseY - (canvas.height * 0.4));

                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);

                    x += sliceWidth;
                }

                const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
                gradient.addColorStop(0, `hsl(${hue}, 100%, 50%)`);
                gradient.addColorStop(0.5, `hsl(${(hue + 90) % 360}, 100%, 50%)`);
                gradient.addColorStop(1, `hsl(${(hue + 180) % 360}, 100%, 50%)`);

                ctx.strokeStyle = gradient;
                ctx.shadowBlur = 10;
                ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
                ctx.stroke();
                ctx.shadowBlur = 0;
            };

            draw();
        };

        checkAnalyserAndDraw();

        return () => {
            active = false;
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [isPlaying]);

    if (!currentTrack) {
        return (
            <div className={clsx("h-screen w-full flex flex-col items-center justify-center", g('relative z-[1]', 'bg-background'))}>
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
            className={clsx("h-screen w-full flex flex-col overflow-hidden select-none relative drag", g('z-[1]', 'bg-background'))}
        >
            {/* Ambient background from album art (Liquid Glass uses the shared LiquidBackdrop instead) */}
            {artUrl && !liquidGlass && (
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <img src={artUrl} className="w-full h-full object-cover blur-[60px] opacity-20 scale-110" alt="" />
                    <div className="absolute inset-0 bg-background/70" />
                </div>
            )}

            {/* ── SPACING FOR MAIN TITLE BAR ────────────────────── */}
            <div className="h-[40px] shrink-0 w-full" />

            {/* ── HEADER ─────────────────────────────────────────── */}
            <div
                className="relative z-10 flex items-center justify-between px-4 pt-2 pb-2 shrink-0 drag"
            >
                {/* Left: Pin + Fav */}
                <div className="flex items-center gap-1.5 no-drag">
                    <button
                        onClick={() => {
                            setIsAlwaysOnTop(!isAlwaysOnTop);
                            (window as any).windowControls.toggleAlwaysOnTop(!isAlwaysOnTop);
                        }}
                        className={clsx(
                            "p-2 rounded-full transition-all",
                            liquidGlass
                                ? clsx(glassBtn, isAlwaysOnTop && "!text-primary lg-active")
                                : clsx("text-primary border-2 border-primary", isAlwaysOnTop ? "bg-primary/20" : "bg-transparent opacity-60 hover:opacity-100 hover:bg-primary/10")
                        )}
                        title={isAlwaysOnTop ? "Always on Top: On" : "Always on Top: Off"}
                    >
                        {isAlwaysOnTop ? <Pin size={16} /> : <PinOff size={16} />}
                    </button>
                    <button
                        onClick={handleFavToggle}
                        title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                        className={clsx(
                            "p-2 rounded-full transition-all",
                            liquidGlass
                                ? clsx(glassBtn, isFav && "!text-primary lg-active")
                                : clsx("text-primary border-2 border-primary", isFav ? "bg-primary/20" : "bg-transparent opacity-60 hover:opacity-100 hover:bg-primary/10")
                        )}
                    >
                        <Heart size={16} fill={isFav ? "currentColor" : "none"} />
                    </button>
                </div>

                <div className={clsx("flex items-center gap-2 rounded-full pl-2 pr-4 py-2 no-drag", g('lg-panel lg-sheen', 'border-2 border-primary shadow-md shadow-primary/20 bg-primary/10'))}>
                    <img src="./app_icon.png" alt="" className="w-5 h-5 drop-shadow-md" />
                    <span className={clsx("text-[12px] font-black uppercase", g('tracking-[0.3em] text-on-background', 'tracking-[0.4em] text-primary'))}>Mini Player</span>
                </div>

                {/* Right: Expand */}
                <button
                    onClick={exitMiniPlayer}
                    title="Open Full Player"
                    className={clsx("p-2 rounded-full transition-all no-drag", g(glassBtn, 'text-primary border-2 border-primary bg-primary/5 opacity-60 hover:opacity-100 hover:bg-primary/10'))}
                >
                    <Maximize2 size={16} />
                </button>
            </div>

            {/* ── SQUARE ALBUM ART CARD (Flip for Lyrics) ─────────── */}
            <div className="relative z-10 w-full px-6 pt-6 shrink-0">
                <div
                    className="w-full aspect-square cursor-pointer [perspective:1000px] group no-drag"
                    onClick={() => setIsFlipped(f => !f)}
                >
                    <motion.div
                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                        transition={{ duration: 0.65, type: 'spring', stiffness: 120, damping: 22 }}
                        className="w-full h-full relative [transform-style:preserve-3d]"
                    >
                        {/* FRONT – Album Art */}
                        <div className={clsx("absolute inset-0 [backface-visibility:hidden] overflow-hidden shadow-2xl border border-white/10 bg-surface-variant/20", g('rounded-[28px]', 'rounded-3xl'))}>
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
                        <div className={clsx("absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] overflow-hidden shadow-2xl flex flex-col", g('rounded-[28px] lg-panel lg-strong lg-blur', 'rounded-3xl border border-primary/20 bg-background/95 backdrop-blur-2xl'))}>
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
                                        const isActive = i === activeLineIndex;
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
            <div className={clsx("relative z-10 w-[85%] mx-auto text-center px-4 py-3 shrink-0 mt-4 mb-2", g('lg-panel lg-sheen rounded-[22px]', 'outline outline-1 outline-primary/30 rounded-2xl bg-primary/5'))}>
                <motion.h3
                    key={currentTrack.id + '-title'}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={clsx("text-[19px] font-black truncate", g('text-on-background', 'text-primary'))}
                >
                    {currentTrack.title}
                </motion.h3>
                <motion.p
                    key={currentTrack.id + '-artist'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[14px] font-black text-primary/70 uppercase tracking-[0.2em] truncate mt-1"
                >
                    {currentTrack.artist}
                </motion.p>
                {currentTrack.album && (
                    <motion.p
                        key={currentTrack.id + '-album'}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[11px] font-black text-primary/40 uppercase tracking-[0.2em] truncate mt-1"
                    >
                        {currentTrack.album}
                    </motion.p>
                )}
            </div>

            {/* ── SCRUBBER ─────────────────────────────────────────── */}
            <div className="relative z-10 w-full px-8 pt-3 pb-1 shrink-0 group no-drag">
                <div className="relative h-6 flex items-center">
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
                    <div className={clsx("w-full h-[5px] rounded-full overflow-hidden", g('lg-ink-track', 'bg-primary/10 border border-primary/40'))}>
                        <motion.div
                            className="h-full bg-primary"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <motion.div
                        className="absolute h-5 w-5 bg-primary rounded-full shadow-[0_0_12px_rgba(var(--md-sys-color-primary),0.6)] border-2 border-background z-10 pointer-events-none"
                        style={{ left: `calc(${progress}% - 10px)` }}
                        animate={{ scale: isDragging ? 1.4 : 1 }}
                    />
                </div>
                <div className="flex justify-between text-[11px] font-black text-primary/40 mt-1 tabular-nums tracking-widest">
                    <span>{formatTime(isDragging ? dragValue : currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            {/* ── CONTROLS ─────────────────────────────────────────── */}
            <div className="relative z-10 w-full flex items-center justify-between px-3 pt-2 pb-2 shrink-0 no-drag">
                {/* Queue */}
                <button
                    onClick={() => setShowQueue(s => !s)}
                    title="Up Next"
                    className={clsx(
                        "p-3 rounded-full transition-all",
                        liquidGlass
                            ? clsx(glassBtn, showQueue && "!text-primary lg-active")
                            : clsx("border-2 border-primary", showQueue ? "text-primary bg-primary/30 shadow-lg shadow-primary/20" : "text-primary/60 hover:text-primary hover:bg-primary/10")
                    )}
                >
                    <ListMusic size={22} />
                </button>

                {/* Transport */}
                <div className="flex items-center gap-0 md:gap-4">
                    <button 
                        onClick={toggleShuffle} 
                        title={shuffle ? "Shuffle: On" : "Shuffle: Off"}
                        className={clsx(
                            "p-2 transition-all active:scale-90 rounded-full",
                            liquidGlass
                                ? (shuffle ? "text-primary lg-active" : "text-on-surface-variant hover:text-on-background")
                                : clsx("border-2", shuffle ? "text-primary bg-primary/30 border-primary shadow-md" : "text-primary/40 border-primary/40 hover:text-primary hover:border-primary")
                        )}
                    >
                        <Shuffle size={20} />
                    </button>
                    <button onClick={() => prev()} title="Previous Track" className={clsx("p-2 hover:scale-110 active:scale-90 transition-all", g('text-on-background', 'text-primary'))}>
                        <SkipBack size={28} fill="currentColor" />
                    </button>
                    <button
                        onClick={isPlaying ? pause : () => play()}
                        title={isPlaying ? "Pause" : "Play"}
                        className={clsx("w-16 h-16 bg-primary text-on-primary flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/50 mx-1", g('rounded-full [box-shadow:inset_0_1px_0_rgba(255,255,255,0.45),0_12px_28px_-8px_rgb(var(--md-sys-color-primary)/0.7)]', 'rounded-2xl border-2 border-white/20'))}
                    >
                        {isPlaying
                            ? <Pause size={34} fill="currentColor" />
                            : <Play size={34} className="ml-1" fill="currentColor" />}
                    </button>
                    <button onClick={() => next()} title="Next Track" className={clsx("p-2 hover:scale-110 active:scale-90 transition-all", g('text-on-background', 'text-primary'))}>
                        <SkipForward size={28} fill="currentColor" />
                    </button>
                    <button 
                        onClick={toggleLoop} 
                        title={loop === 'one' ? "Repeat: One" : loop === 'all' ? "Repeat: All" : "Repeat: Off"}
                        className={clsx(
                            "p-2 transition-all active:scale-90 rounded-full relative",
                            liquidGlass
                                ? (loop !== 'none' ? "text-primary lg-active" : "text-on-surface-variant hover:text-on-background")
                                : clsx("border-2", loop !== 'none' ? "text-primary bg-primary/30 border-primary shadow-md" : "text-primary/40 border-primary/40 hover:text-primary hover:border-primary")
                        )}
                    >
                        <Repeat size={20} />
                        {loop === 'one' && <span className="absolute text-[10px] font-black -top-2 -right-2 bg-primary text-on-primary rounded-full w-5 h-5 flex items-center justify-center border-2 border-on-primary shadow-sm leading-none">1</span>}
                    </button>
                </div>

                <button
                    onClick={async () => {
                        await exitMiniPlayer();
                        setTimeout(() => usePlayerStore.getState().togglePlayer(), 300);
                    }}
                    className={clsx("p-3 rounded-full transition-all", g(glassBtn, 'border-2 border-primary text-primary/60 hover:text-primary hover:bg-primary/10'))}
                    title="Zen Mode"
                >
                    <Airplay size={22} />
                </button>
            </div>

            {/* ── VOLUME & EQ ─────────────────────────────────────────── */}
            <div className="relative z-10 w-full flex items-center justify-center gap-3 px-8 mb-6 mt-1 no-drag">
                <div className={clsx("flex-1 max-w-[280px] flex items-center justify-center gap-3 px-5 py-2 rounded-full transition-all group", g('lg-panel', 'outline outline-1 outline-primary/30 bg-primary/5 hover:bg-primary/10'))}>
                    <button onClick={toggleMute} title={isMuted || volume === 0 ? "Unmute" : "Mute"} className="text-primary/60 hover:text-primary transition-transform hover:scale-110">
                        {isMuted || volume === 0 ? <VolumeX size={18} /> : volume < 0.5 ? <Volume1 size={18} /> : <Volume2 size={18} />}
                    </button>
                    <div className="relative flex-1 h-6 flex items-center">
                        <input
                            type="range"
                            min="0" max="1" step="0.01"
                            value={isMuted ? 0 : volume}
                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="w-full h-1.5 rounded-full overflow-hidden bg-primary/20">
                            <div
                                className="h-full transition-all duration-100 ease-out bg-primary"
                                style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                            />
                        </div>
                        <div
                            className="h-3 w-3 bg-white rounded-full absolute pointer-events-none shadow-sm transition-all duration-100 ease-out"
                            style={{ left: `calc(${(isMuted ? 0 : volume) * 100}% - 6px)` }}
                        />
                    </div>
                    <span className="text-[10px] font-black text-primary/40 w-8 text-right tabular-nums">
                        {Math.round((isMuted ? 0 : volume) * 100)}%
                    </span>
                </div>

                {/* EQ Button (Separate with own outline) */}
                <div className="relative">
                    <button
                        onClick={toggleEq}
                        className={clsx(
                            "p-2.5 rounded-full transition-all hover:scale-110 border border-primary/30 shadow-sm",
                            isEqOpen || isEqEnabled
                                ? "text-on-primary bg-primary border-primary shadow-lg shadow-primary/30"
                                : g(glassBtn, "bg-primary/5 text-primary/60 hover:text-primary hover:bg-primary/10 hover:border-primary/50")
                        )}
                        title="Equalizer"
                    >
                        <SlidersHorizontal size={18} />
                    </button>
                    <Equalizer
                        isOpen={isEqOpen}
                        onClose={() => setEqOpen(false)}
                        anchor="bottom"
                        align="mini"
                    />
                </div>
            </div>

            {/* ── VISUALIZER (At Bottom) ─────────────────────────────── */}
            <div className="absolute bottom-[7px] left-0 right-0 h-24 pointer-events-none z-[5] overflow-hidden opacity-100">
                <canvas
                    ref={canvasRef}
                    className="w-full h-full object-fill drop-shadow-[0_0_20px_rgba(var(--md-sys-color-primary),0.9)]"
                    width={400}
                    height={96}
                />
            </div>

            {/* ── QUEUE OVERLAY ─────────────────────────────────────── */}
            <AnimatePresence>
                {showQueue && (
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                        className={clsx("absolute inset-x-0 bottom-0 z-[100] flex flex-col", g('lg-panel lg-strong lg-blur rounded-t-[28px] border-b-0', 'bg-background/95 backdrop-blur-2xl border-t border-primary/10 rounded-t-3xl'))}
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
