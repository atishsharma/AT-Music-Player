import { useEffect, useState, useRef } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { useThemeStore } from '../../store/themeStore';
import { useFavoritesStore } from '../../store/favoritesStore';
import { usePlaylistStore } from '../../store/playlistStore';
import { ChevronDown, ChevronUp, ListMusic, Mic2, Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Music2, X, Activity, RefreshCw, Maximize2, Minimize2, Volume2, VolumeX, Box, Dna, Hexagon, Sun, ArrowUpLeft, Heart, Plus } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import BackgroundWatermarks from './BackgroundWatermarks';
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

// Extracted Item for main Zen Queue
const ZenQueueItem = ({ track, i, isFav, play, removeFromQueue, addFavorite, removeFavorite, appearance, queue, reorderQueue }: any) => {
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
            className={clsx("relative group/item outline-none p-3 rounded-xl flex items-center gap-4 transition-colors border border-transparent hover:border-primary/30 cursor-pointer", appearance === 'light' ? "bg-background hover:bg-primary/5" : "bg-background hover:bg-primary/10")}
        >

            <QueueStepControls index={i} queue={queue} reorderQueue={reorderQueue} appearance={appearance} />

            <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-variant flex-shrink-0 relative shadow-sm cursor-pointer" onClick={() => { play(track); removeFromQueue(i); }}>
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

            {/* Action Buttons - Always visible inside queue items, highlighting primary action */}
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

// Extracted Item for Mini Queue Popup
const MiniQueueItem = ({ track, i, isFav, play, removeFromQueue, addFavorite, removeFavorite, setShowQueuePopup, appearance, queue, reorderQueue }: any) => {
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
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white transition-colors group border border-transparent cursor-pointer"
        >

            <QueueStepControls index={i} queue={queue} reorderQueue={reorderQueue} appearance={appearance} />

            <div className="w-8 h-8 rounded-lg overflow-hidden bg-black/10 shadow-inner shrink-0 cursor-pointer relative" onClick={() => { play(track); removeFromQueue(i); setShowQueuePopup(false); }}>
                <img src={track.image_path?.startsWith('http') ? track.image_path : track.image_path ? toAtmusicUrl(track.image_path) : track.thumbnail} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Play size={12} className="text-white fill-current drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                </div>
            </div>
            <div className="flex-1 min-w-0 pointer-events-none text-left">
                <p className="text-xs font-bold truncate text-on-primary group-hover:text-primary transition-colors">{track.title}</p>
                <p className="text-[10px] text-on-primary/70 truncate group-hover:text-primary/70">{track.artist}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-0.5 transition-opacity">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        const id = track.id?.toString() || track.id;
                        isFav ? removeFavorite(id) : addFavorite({ ...track, id, type: 'song' });
                    }}
                    className={clsx("p-1.5 rounded-full transition-colors", isFav ? "text-primary bg-primary/10" : "text-primary hover:bg-primary/20")}
                >
                    <Heart size={14} fill={isFav ? "currentColor" : "none"} />
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
                        className={clsx("p-1.5 rounded-full text-primary hover:bg-primary/20 transition-colors", showPlaylistPopup && "bg-primary/20")}
                    >
                        <Plus size={14} />
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
                    className="p-1.5 rounded-full text-primary hover:bg-red-500/20 hover:text-red-500 transition-colors"
                >
                    <X size={14} />
                </button>
            </div>
        </motion.div>
    );
};

const NowPlaying = () => {
    const appearance = useThemeStore(state => state.appearance);
    const { isPlayerOpen, togglePlayer, currentTrack, currentTime, duration, isPlaying, pause, play, next, prev, loop, toggleLoop, shuffle, toggleShuffle, seek, setVolume, volume, isMuted, toggleMute, queue, lyrics, setLyrics, loadingLyrics, setLoadingLyrics, reorderQueue, removeFromQueue, clearQueue } = usePlayerStore() as any;

    const [activeTab, setActiveTab] = useState<'queue' | 'lyrics'>('lyrics');
    const [vizMode, setVizMode] = useState<'wave' | 'piano' | 'isometric' | 'dna' | 'geometry' | 'solar'>('isometric');
    const [playbackMode, setPlaybackMode] = useState<'audio' | 'video'>('audio');
    const [visualizerActive, setVisualizerActive] = useState(false);
    const [isFullScreenViz, setIsFullScreenViz] = useState(false);

    const { addFavorite, removeFavorite, isFavorite } = useFavoritesStore();
    const { addTrackToPlaylist } = usePlaylistStore();

    const isFav = currentTrack ? isFavorite(currentTrack.id?.toString() || currentTrack.id) : false;

    const handleFavToggle = () => {
        if (!currentTrack) return;
        if (isFav) removeFavorite(currentTrack.id?.toString() || currentTrack.id);
        else addFavorite({ ...currentTrack, id: currentTrack.id?.toString() || currentTrack.id, type: 'song' });
    };

    const [fetchedVideoId, setFetchedVideoId] = useState<string | null>(null);

    // Lyrics Search State
    const [searchForm, setSearchForm] = useState({ title: '', artist: '', album: '' });

    // Save Playlist State
    const [isDraggingSlider, setIsDraggingSlider] = useState(false);
    const [sliderValue, setSliderValue] = useState(0);

    const [showQueuePopup, setShowQueuePopup] = useState(false);
    const [showPlaylistPopup, setShowPlaylistPopup] = useState(false);
    const [playlists, setPlaylists] = useState<any[]>([]);

    const truncateTitle = (text: string, limit: number = 40) => {
        if (!text || text.length <= limit) return text;
        const sub = text.substring(0, limit);
        const lastSpace = sub.lastIndexOf(' ');
        if (lastSpace > 0) return sub.substring(0, lastSpace) + '...';
        return sub + '...';
    };

    const lyricsContainerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();
    const queuePopupRef = useRef<HTMLDivElement>(null);
    const playlistPopupRef = useRef<HTMLDivElement>(null);

    // Escape Key Listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isPlayerOpen) {
                togglePlayer(false);
                setShowQueuePopup(false);
                setShowPlaylistPopup(false);
            }
        };

        const handleClickOutside = (e: MouseEvent) => {
            if (queuePopupRef.current && !queuePopupRef.current.contains(e.target as Node)) {
                setShowQueuePopup(false);
            }
            if (playlistPopupRef.current && !playlistPopupRef.current.contains(e.target as Node)) {
                setShowPlaylistPopup(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('mousedown', handleClickOutside);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isPlayerOpen, togglePlayer]);

    useEffect(() => {
        const fetchLyricsAndVideo = async () => {
            setFetchedVideoId(null);
            if (currentTrack) {
                setLyrics(null);

                // Fetch Lyrics
                try {
                    setLoadingLyrics(true);
                    setSearchForm({
                        title: currentTrack.title || '',
                        artist: currentTrack.artist || '',
                        album: currentTrack.album || ''
                    });

                    const data = await window.ipcRenderer.invoke('lyrics:get', {
                        artist: currentTrack.artist,
                        title: currentTrack.title,
                        album: currentTrack.album,
                        duration: currentTrack.duration
                    });
                    setLyrics(data);
                } catch (err) {
                    console.error("Failed to fetch lyrics", err);
                } finally {
                    setLoadingLyrics(false);
                }

                // Fetch Video ID if missing (for local files)
                // Also if we have a 'youtubeId' in the track object (from search), use it directly
                if (currentTrack.youtubeId) {
                    setFetchedVideoId(currentTrack.youtubeId);
                }
                else if (!currentTrack.video_id && !currentTrack.id?.toString().startsWith('http')) {
                    try {
                        const query = `${currentTrack.title} ${currentTrack.artist} Official Music Video`;
                        const vidId = await window.ipcRenderer.invoke('youtube:getVideoId', query);
                        if (vidId) setFetchedVideoId(vidId);
                    } catch (err) {
                        console.error("Failed to fetch video ID", err);
                    }
                }
            }
        };
        fetchLyricsAndVideo();
    }, [currentTrack]);

    // Auto-scroll synced lyrics
    useEffect(() => {
        if (!Array.isArray(lyrics?.syncedLyrics) || activeTab !== 'lyrics') return;

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
    }, [currentTime, lyrics, activeTab, lyricsContainerRef, isDraggingSlider]);

    // Visualizer Loop
    useEffect(() => {
        if (!isPlayerOpen || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const analyser = (window as any)._audioAnalyser;
        if (!analyser) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            // Artwork Pulsing (Beat detection approximation) - Removed to prevent excessive re-renders
            // const lowFreqs = dataArray.slice(0, 10);
            // const avgLowRes = lowFreqs.reduce((a, b) => a + b, 0) / lowFreqs.length;
            // const targetScale = 1 + (avgLowRes / 255) * 0.15;
            // setArtworkScale(targetScale);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            let primaryColor = getComputedStyle(document.body).getPropertyValue('--color-primary').trim();
            if (!primaryColor || primaryColor.length < 3) primaryColor = '59, 130, 246';

            // Dynamic Colorful Logic
            const time = Date.now() / 1000;
            const hue = (time * 20) % 360; // Rotating base hue


            if (vizMode === 'wave') {
                analyser.getByteTimeDomainData(dataArray);
                ctx.lineWidth = 3;

                // Multi-colored Wave
                ctx.beginPath();
                const sliceWidth = canvas.width * 1.0 / bufferLength;
                let x = 0;
                const baseY = canvas.height * 0.85;

                for (let i = 0; i < bufferLength; i++) {
                    const v = dataArray[i] / 128.0;
                    const y = v * 80 + (baseY - 80);

                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);

                    x += sliceWidth;
                }

                // Apply gradient stroke
                const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
                gradient.addColorStop(0, `hsl(${hue}, 100%, 50%)`);
                gradient.addColorStop(0.5, `hsl(${(hue + 90) % 360}, 100%, 50%)`);
                gradient.addColorStop(1, `hsl(${(hue + 180) % 360}, 100%, 50%)`);

                ctx.strokeStyle = gradient;
                ctx.shadowBlur = 10;
                ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
                ctx.stroke();
                ctx.shadowBlur = 0;

            } else if (vizMode === 'piano') {
                // Piano Hero / Magic Tiles Style
                const laneCount = 16; // Number of vertical lanes
                const laneWidth = canvas.width / laneCount;


                // Add new tiles based on frequency peaks
                // We'll sample the frequency array at intervals
                const sampleStep = Math.floor(bufferLength / laneCount);

                for (let i = 0; i < laneCount; i++) {
                    const freqIndex = i * sampleStep;
                    const value = dataArray[freqIndex];

                    // Threshold to spawn a tile
                    if (value > 150 && Math.random() > 0.8) {
                        // Only spawn if valid
                        // We can push to a ref-based array if we want persistence across frames without state re-renders
                        // But for now, let's just draw "falling" bars based on instant data but offset by time?
                        // Actually, strict falling requires state.
                        // Let's simluate it with a noise flow or just bars falling from top
                    }
                }

                // Since this is a stateless draw loop (mostly), implementing true falling tiles 
                // requires a mutable ref for game state.
                // Let's use a simpler "Scrolling Spectrum" approach which looks like notes coming down.

                // 1. Draw Lanes
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.lineWidth = 1;
                for (let i = 1; i < laneCount; i++) {
                    ctx.beginPath();
                    ctx.moveTo(i * laneWidth, 0);
                    ctx.lineTo(i * laneWidth, canvas.height);
                    ctx.stroke();
                }

                // 2. "Hit Line" at bottom
                const hitY = canvas.height * 0.9;
                ctx.beginPath();
                ctx.moveTo(0, hitY);
                ctx.lineTo(canvas.width, hitY);
                ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.5)`;
                ctx.lineWidth = 2;
                ctx.shadowBlur = 10;
                ctx.shadowColor = `hsla(${hue}, 100%, 50%, 0.8)`;
                ctx.stroke();
                ctx.shadowBlur = 0;

                // 3. Draw "Notes"
                // We map frequency bands to lanes.
                // Since we can't easily do "stateful falling objects" efficiently inside this functional loop without external refs,
                // We will visualize the CURRENT frame as a "block" at the hit line, and maybe "past" frames above it?
                // Visualizing "history" is expensive without a dedicated buffer.
                // ALTERNATIVE: Draw bars from Top to Bottom, where length = intensity.
                // BUT user asked for "scrolling down".
                // Let's fake it:
                // We can use a rolling buffer or just standard bars that "grow" from the Hit Line UPWARDS (standard visualizer) 
                // or DOWNWARDS from top? 
                // "Scrolling down the sheet" -> Notes come from Top and hit Bottom.

                // Let's try a visual trick:
                // Draw rectangles in each lane. Y position depends on (Time + Offset) % Height? No that's random.
                // Real implementation:

                // Simplified "Piano Roll" view:
                // Just standard bars but inverted hanging from top? No, that's Stalactites.

                // Let's stick to a high-quality "Lane" visualizer that pulses.

                for (let i = 0; i < laneCount; i++) {
                    const freqIndex = Math.floor(i * sampleStep);
                    const value = dataArray[freqIndex];
                    const percent = value / 255;

                    if (percent > 0.1) {
                        const blockHeight = percent * (canvas.height * 0.4);
                        const x = i * laneWidth;
                        // Draw "Note" hitting the line

                        const color = `hsla(${(hue + i * 10) % 360}, 100%, 60%, ${percent})`;

                        // Main block at hit line
                        ctx.fillStyle = color;
                        ctx.fillRect(x + 2, hitY - blockHeight, laneWidth - 4, blockHeight);

                        // Reflection below line
                        ctx.fillStyle = `hsla(${(hue + i * 10) % 360}, 100%, 60%, ${percent * 0.3})`;
                        ctx.fillRect(x + 2, hitY, laneWidth - 4, blockHeight * 0.2);
                    }
                }
            }
            else if (vizMode === 'isometric') {
                // Isometric Colorful Blocks
                const items = 10;
                const size = canvas.width / items;

                analyser.getByteFrequencyData(dataArray);

                for (let x = 0; x < items; x++) {
                    for (let y = 0; y < items; y++) {
                        const i = (x + y) % (bufferLength / 4);
                        const value = dataArray[i * 2];
                        const height = (value / 255) * 60;

                        const isoX = (x - y) * size * 0.5 + canvas.width / 2;
                        const isoY = (x + y) * size * 0.25 + canvas.height / 3;

                        const color = `hsla(${(hue + x * 20 + y * 20) % 360}, 80%, 60%, 0.8)`;
                        const topColor = `hsla(${(hue + x * 20 + y * 20) % 360}, 80%, 70%, 1)`;
                        const sideColor = `hsla(${(hue + x * 20 + y * 20) % 360}, 80%, 50%, 0.6)`;

                        // Top
                        ctx.fillStyle = topColor;
                        ctx.beginPath();
                        ctx.moveTo(isoX, isoY - height);
                        ctx.lineTo(isoX + size * 0.5, isoY - size * 0.25 - height);
                        ctx.lineTo(isoX, isoY - size * 0.5 - height);
                        ctx.lineTo(isoX - size * 0.5, isoY - size * 0.25 - height);
                        ctx.fill();

                        // Right
                        ctx.fillStyle = sideColor;
                        ctx.beginPath();
                        ctx.moveTo(isoX, isoY - height);
                        ctx.lineTo(isoX + size * 0.5, isoY - size * 0.25 - height);
                        ctx.lineTo(isoX + size * 0.5, isoY - size * 0.25);
                        ctx.lineTo(isoX, isoY);
                        ctx.fill();

                        // Left
                        ctx.fillStyle = color;
                        ctx.beginPath();
                        ctx.moveTo(isoX, isoY - height);
                        ctx.lineTo(isoX - size * 0.5, isoY - size * 0.25 - height);
                        ctx.lineTo(isoX - size * 0.5, isoY - size * 0.25);
                        ctx.lineTo(isoX, isoY);
                        ctx.fill();
                    }
                }
            } else if (vizMode === 'dna') {
                // Neon DNA Helix
                analyser.getByteFrequencyData(dataArray);
                const particles = 40;
                const spacing = canvas.width / particles;
                const amplitude = canvas.height / 4;
                const centerY = canvas.height / 2;
                const t = time * 2;

                // Bass kick for expansion
                const bassRaw = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
                const expansion = 1 + (bassRaw / 255) * 0.5;

                for (let i = 0; i < particles; i++) {
                    const x = i * spacing + spacing / 2;
                    const offset = (i / particles) * Math.PI * 4;
                    const y1 = centerY + Math.sin(t + offset) * amplitude * expansion;
                    const y2 = centerY + Math.sin(t + offset + Math.PI) * amplitude * expansion;

                    const freqIdx = Math.floor((i / particles) * bufferLength * 0.5);
                    const val = dataArray[freqIdx] / 255;

                    // Connection
                    ctx.beginPath();
                    ctx.moveTo(x, y1);
                    ctx.lineTo(x, y2);
                    ctx.strokeStyle = `hsla(${(hue + i * 10) % 360}, 100%, 50%, ${val * 0.5})`;
                    ctx.lineWidth = 2 * expansion;
                    ctx.stroke();

                    // Nucleotides
                    ctx.fillStyle = `hsla(${(hue + i * 10) % 360}, 100%, 70%, 1)`;
                    ctx.beginPath();
                    ctx.arc(x, y1, 4 * expansion + val * 5, 0, Math.PI * 2);
                    ctx.arc(x, y2, 4 * expansion + val * 5, 0, Math.PI * 2);
                    ctx.fill();

                    // Glow
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = `hsla(${(hue + i * 10) % 360}, 100%, 50%, 0.8)`;
                }
                ctx.shadowBlur = 0;

            } else if (vizMode === 'geometry') {
                // Sacred Geometry
                analyser.getByteFrequencyData(dataArray);
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                const maxRadius = Math.min(canvas.width, canvas.height) * 0.4;

                // 3 shapes: Triangle, Square, Hexagon
                const shapes = [3, 4, 6];

                shapes.forEach((sides, idx) => {
                    const band = Math.floor((idx / shapes.length) * bufferLength * 0.3);
                    const val = dataArray[band] / 255;
                    const radius = maxRadius * (0.3 + 0.2 * idx) * (0.8 + 0.4 * val);
                    const rot = time * (idx + 1) * 0.5;

                    ctx.beginPath();
                    for (let i = 0; i < sides; i++) {
                        const theta = rot + (i / sides) * Math.PI * 2;
                        const x = centerX + Math.cos(theta) * radius;
                        const y = centerY + Math.sin(theta) * radius;
                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.closePath();

                    ctx.lineWidth = 4 + val * 4;
                    ctx.strokeStyle = `hsla(${(hue + idx * 60) % 360}, 100%, 60%, 0.8)`;
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = ctx.strokeStyle;
                    ctx.stroke();

                    // Inner filled variant
                    ctx.fillStyle = `hsla(${(hue + idx * 60) % 360}, 100%, 60%, 0.1)`;
                    ctx.fill();
                });
                ctx.shadowBlur = 0;

            } else if (vizMode === 'solar') {
                // Solar Flare
                analyser.getByteFrequencyData(dataArray);
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                const bass = dataArray.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
                const sunRadius = 40 + (bass / 255) * 40;

                // Core
                ctx.beginPath();
                ctx.arc(centerX, centerY, sunRadius, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${hue}, 100%, 70%, 1)`;
                ctx.shadowBlur = 50 + sunRadius;
                ctx.shadowColor = `hsla(${hue}, 100%, 50%, 0.8)`;
                ctx.fill();

                // Rays
                const rays = 64;
                for (let i = 0; i < rays; i++) {
                    // Map ray index to freq band
                    const dataIdx = Math.floor((i / rays) * bufferLength * 0.7);
                    const val = dataArray[dataIdx];
                    const rayLen = (val / 255) * (Math.min(canvas.width, canvas.height) * 0.4);

                    const angle = (i / rays) * Math.PI * 2 + time * 0.2;
                    const endX = centerX + Math.cos(angle) * (sunRadius + rayLen);
                    const endY = centerY + Math.sin(angle) * (sunRadius + rayLen);
                    const startX = centerX + Math.cos(angle) * sunRadius;
                    const startY = centerY + Math.sin(angle) * sunRadius;

                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(endX, endY);
                    ctx.lineWidth = 2;
                    ctx.lineCap = 'round';
                    ctx.strokeStyle = `hsla(${(hue + val) % 360}, 100%, 60%, ${val / 300})`;
                    ctx.stroke();
                }
                ctx.shadowBlur = 0;
            }
        };



        draw();
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [isPlayerOpen, vizMode, activeTab, playbackMode, isFullScreenViz]);

    const formatTime = (seconds: number) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleManualSearch = async () => {
        try {
            setLoadingLyrics(true);
            const data = await window.ipcRenderer.invoke('lyrics:get', {
                artist: searchForm.artist,
                title: searchForm.title,
                album: searchForm.album
            });
            setLyrics(data);
        } catch (err) {
            console.error("Manual lyrics search failed", err);
        } finally {
            setLoadingLyrics(false);
        }
    };

    if (!isPlayerOpen || !currentTrack) return null;

    const videoId = fetchedVideoId || currentTrack.video_id || (currentTrack.id?.toString().length > 10 ? currentTrack.id : null);

    return (
        <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-background z-[60] flex flex-col overflow-hidden"
        >
            {/* Unified Vibrant Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background/90 to-primary/20 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-background/50 to-surface-variant/10 pointer-events-none mix-blend-overlay" />
            <BackgroundWatermarks />

            {/* If Video Mode, add a backdrop to focus on video */}
            {playbackMode === 'video' && (
                <div className="absolute inset-0 bg-background/90 z-0 transition-opacity duration-500" />
            )}


            {/* Header Controls */}
            <div className="h-20 flex items-center justify-between px-8 z-30 relative shrink-0 border-b-[1px] border-primary">
                {/* Left side */}
                <div className="flex items-center gap-6 flex-1">
                    <button onClick={togglePlayer} className="p-3 bg-primary text-on-primary outline outline-1 outline-primary rounded-full transition-all hover:rotate-90 hover:brightness-110 shadow-[0_0_15px_rgba(var(--md-sys-color-primary),0.5)]">
                        <ChevronDown size={32} />
                    </button>
                    <AnimatePresence>
                        {visualizerActive && (
                            <motion.div
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                className="flex items-center gap-2 overflow-hidden"
                            >
                                <div className="flex items-center gap-2 outline outline-1 outline-primary/50 bg-surface-variant/10 rounded-full px-2 py-1 shadow-sm">
                                    <button onClick={() => setVizMode('wave')} className={clsx("p-2 rounded-full transition-all hover:bg-white/10", vizMode === 'wave' ? "text-primary bg-white/10" : "text-on-surface-variant/40")} title="Wave">
                                        <Activity size={24} />
                                    </button>
                                    <button onClick={() => setVizMode('piano')} className={clsx("p-2 rounded-full transition-all hover:bg-white/10", vizMode === 'piano' ? "text-primary bg-white/10" : "text-on-surface-variant/40")} title="Piano">
                                        <ListMusic size={24} className="rotate-90" />
                                    </button>
                                    <button onClick={() => setVizMode('isometric')} className={clsx("p-2 rounded-full transition-all hover:bg-white/10", vizMode === 'isometric' ? "text-primary bg-white/10" : "text-on-surface-variant/40")} title="Isometric Blocks">
                                        <Box size={24} />
                                    </button>
                                    <button onClick={() => setVizMode('dna')} className={clsx("p-2 rounded-full transition-all hover:bg-white/10", vizMode === 'dna' ? "text-primary bg-white/10" : "text-on-surface-variant/40")} title="DNA">
                                        <Dna size={24} />
                                    </button>
                                    <button onClick={() => setVizMode('geometry')} className={clsx("p-2 rounded-full transition-all hover:bg-white/10", vizMode === 'geometry' ? "text-primary bg-white/10" : "text-on-surface-variant/40")} title="Sacred Geometry">
                                        <Hexagon size={24} />
                                    </button>
                                    <button onClick={() => setVizMode('solar')} className={clsx("p-2 rounded-full transition-all hover:bg-white/10", vizMode === 'solar' ? "text-primary bg-white/10" : "text-on-surface-variant/40")} title="Solar Flare">
                                        <Sun size={24} />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Center Banner */}
                <div className="flex shrink-0 items-center justify-center gap-3 px-6 py-2 outline outline-1 outline-primary/50 bg-primary/5 rounded-2xl shadow-sm cursor-default">
                    <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-on-primary font-black text-sm shadow-md shadow-primary/40">
                        AT
                    </div>
                    <h1 className="text-xl font-black tracking-widest text-primary drop-shadow-[0_2px_10px_rgba(var(--md-sys-color-primary),0.5)] uppercase">
                        Music Player
                    </h1>
                </div>

                {/* Right: Android-Style Volume Slider */}
                <div className="flex items-center justify-end flex-1">
                    <div className="flex items-center gap-3 group bg-surface-variant/10 rounded-full pl-3 pr-4 py-1.5 outline outline-1 outline-primary/50 backdrop-blur-sm transition-all hover:bg-surface-variant/20 shadow-sm">
                        <button onClick={toggleMute} className="hover:scale-110 transition-transform">
                            {isMuted || volume === 0 ? <VolumeX size={18} className="text-primary" /> : <Volume2 size={18} className="text-primary" />}
                        </button>
                        <div className="relative w-32 h-6 flex items-center">
                            <input
                                type="range"
                                min={0} max={1} step={0.01}
                                value={volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            {/* Custom Track */}
                            <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-100 ease-out shadow-[0_0_10px_rgba(var(--md-sys-color-primary),0.5)]"
                                    style={{ width: `${volume * 100}%` }}
                                />
                            </div>
                            {/* Thumb Indicator (Visual only) */}
                            <div
                                className="h-3 w-3 bg-primary rounded-full absolute pointer-events-none shadow-[0_0_10px_rgba(var(--md-sys-color-primary),1)] transition-all duration-100 ease-out"
                                style={{ left: `calc(${volume * 100}% - 6px)` }}
                            />
                        </div>
                        <span className="text-xs font-bold text-primary w-8 text-right tabular-nums">
                            {Math.round(volume * 100)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Content Container */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row relative z-20">
                {/* Left: Art & Controls (50% Width) */}
                <div className={clsx("flex-1 flex flex-col items-center p-8 lg:p-12 relative overflow-hidden transition-all duration-300",
                    playbackMode !== 'video' && "border-r border-white/5"
                )}>

                    {/* Metadata (Top of Left Column) */}
                    <div className="w-full text-center mb-6 relative z-40 shrink-0 px-4">
                        <div className="flex flex-col items-center gap-2 outline outline-1 outline-primary p-4 rounded-3xl shadow-[0_10px_30px_rgba(var(--md-sys-color-primary),0.3)] bg-surface/30 backdrop-blur-md">
                            <h2 className="text-3xl font-black text-on-background drop-shadow-md text-center line-clamp-2 leading-tight" title={currentTrack.title}>
                                {truncateTitle(currentTrack.title)}
                            </h2>
                            <div className="flex items-center gap-2 text-on-surface-variant justify-center">
                                <span className="text-primary font-bold text-lg">{currentTrack.artist}</span>
                                {currentTrack.album && (
                                    <>
                                        <span className="opacity-40">•</span>
                                        <span className="text-sm font-black uppercase tracking-widest opacity-80">{currentTrack.album}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Song/Video Toggle */}
                    {(videoId || !currentTrack.video_id) && (
                        <div className="mb-8 mt-2 bg-surface-variant/20 backdrop-blur-md p-1.5 rounded-full border border-white/10 flex items-center z-30 shadow-xl shrink-0">
                            <button
                                onClick={() => setPlaybackMode('audio')}
                                className={clsx("px-8 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300",
                                    playbackMode === 'audio'
                                        ? "bg-primary text-on-primary shadow-lg shadow-primary/30 scale-105"
                                        : "text-on-surface-variant hover:text-primary hover:bg-primary/5")}
                            >
                                Song
                            </button>
                            <button
                                disabled={!videoId}
                                onClick={() => {
                                    setPlaybackMode('video');
                                    // Pause audio playback when switching to video
                                    if (isPlaying) pause();
                                }}
                                className={clsx("px-8 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2",
                                    playbackMode === 'video'
                                        ? "bg-primary text-on-primary shadow-lg shadow-primary/30 scale-105"
                                        : "text-on-surface-variant hover:text-primary hover:bg-primary/5",
                                    !videoId && "opacity-50 cursor-not-allowed")}
                            >
                                {videoId ? "Video" : (
                                    <>
                                        <RefreshCw size={12} className="animate-spin" />
                                        Finding...
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Artwork / Video Container */}
                    {playbackMode === 'video' && videoId ? (
                        <div className="w-full flex-1 h-full rounded-3xl overflow-hidden shadow-2xl bg-black z-10 border border-white/10 relative">
                            <iframe
                                src={`https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1&enablejsapi=1&rel=0`}
                                className="w-full h-full absolute inset-0 md:rounded-3xl"
                                allow="autoplay; encrypted-media; fullscreen"
                                allowFullScreen
                            />
                        </div>
                    ) : (
                        <div className="relative flex-1 w-full flex items-center justify-center mb-8">
                            {/* Full Screen Trigger Button (Hidden when full screen active) */}
                            <div className="absolute top-4 right-4 z-40">
                                <button
                                    onClick={() => setIsFullScreenViz(true)}
                                    className="p-3 bg-black/40 hover:bg-primary text-white rounded-full transition-all border border-white/10 backdrop-blur-md"
                                    title="Full Screen Visualizer"
                                >
                                    <Maximize2 size={24} />
                                </button>
                            </div>

                            {/* Standard Visualizer Canvas (Only rendered if NOT in full screen) */}
                            {!isFullScreenViz && (
                                <canvas
                                    ref={canvasRef}
                                    className={clsx("absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-500",
                                        visualizerActive ? "opacity-100 z-10" : "opacity-0 z-0"
                                    )}
                                    width={1200}
                                    height={800}
                                />
                            )}

                            {/* Artwork with Flip Animation */}
                            <div className="relative z-20 w-full h-full flex items-center justify-center pointer-events-none">
                                <motion.div
                                    layout
                                    onClick={() => setVisualizerActive(!visualizerActive)}
                                    initial={false}
                                    animate={visualizerActive ? {
                                        width: 80,
                                        height: 80,
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        borderRadius: 12
                                    } : {
                                        width: '100%',
                                        maxWidth: 384,
                                        aspectRatio: 1, // Enforce square aspect ratio
                                        position: 'relative',
                                        borderRadius: 30,
                                        top: 'auto',
                                        left: 'auto'
                                    }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    className="overflow-hidden shadow-[0_30px_60px_rgba(var(--md-sys-color-primary),0.3)] border border-primary/10 cursor-pointer pointer-events-auto bg-primary/5 aspect-square"

                                >
                                    {currentTrack.image_path || currentTrack.thumbnail ? (
                                        <img
                                            src={currentTrack.image_path?.startsWith('http') ? currentTrack.image_path : currentTrack.image_path ? toAtmusicUrl(currentTrack.image_path) : currentTrack.thumbnail}
                                            alt={currentTrack.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                                            <Mic2 size={visualizerActive ? 32 : 80} className="text-white/20" />
                                        </div>
                                    )}

                                    {!visualizerActive && (
                                        <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-md p-3 rounded-full text-white/90 shadow-xl border border-white/20 animate-pulse pointer-events-none">
                                            <ArrowUpLeft size={24} />
                                        </div>
                                    )}
                                </motion.div>
                            </div>
                        </div>
                    )}

                    {/* Controls & Progress (Hidden in Video Mode) */}
                    {playbackMode !== 'video' && (
                        <div className="w-full max-w-xl space-y-8 mt-auto">
                            {/* Progress Bar */}
                            <div className="space-y-4 group">
                                <div className="relative h-6 flex items-center cursor-pointer">
                                    <input
                                        type="range"
                                        min={0}
                                        max={duration || 100}
                                        value={isDraggingSlider ? sliderValue : currentTime}
                                        onChange={(e) => {
                                            setSliderValue(parseFloat(e.target.value));
                                            if (!isDraggingSlider) setIsDraggingSlider(true);
                                        }}
                                        onMouseDown={() => setIsDraggingSlider(true)}
                                        onMouseUp={(e) => {
                                            setIsDraggingSlider(false);
                                            seek(parseFloat((e.target as HTMLInputElement).value));
                                        }}
                                        onTouchStart={() => setIsDraggingSlider(true)}
                                        onTouchEnd={(e) => {
                                            setIsDraggingSlider(false);
                                            seek(parseFloat((e.target as HTMLInputElement).value));
                                        }}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                    />
                                    {/* Android-Style Track */}
                                    <div className={clsx(
                                        "w-full h-2 rounded-full overflow-hidden backdrop-blur-md border",
                                        appearance === 'light' ? "bg-black/10 border-black/5" : "bg-white/10 border-white/5"
                                    )}>
                                        <div
                                            className="h-full bg-primary transition-all duration-100 ease-linear shadow-lg shadow-primary/40"
                                            style={{ width: `${((isDraggingSlider ? sliderValue : currentTime) / (duration || 1)) * 100}%` }}
                                        />
                                    </div>
                                    {/* Android Blob Seeker */}
                                    <div
                                        className={clsx(
                                            "absolute h-5 w-5 bg-primary rounded-full shadow-2xl transition-all duration-200 pointer-events-none z-10 border-2 border-on-primary/20 shadow-primary/50",
                                            isDraggingSlider ? "scale-[1.7]" : "group-hover:scale-125 scale-100"
                                        )}
                                        style={{ left: `calc(${((isDraggingSlider ? sliderValue : currentTime) / (duration || 1)) * 100}% - 10px)` }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs font-bold text-on-surface-variant/60 tracking-wider">
                                    <span>{formatTime(currentTime)}</span>
                                    <span>{formatTime(duration)}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-6 px-4">
                                <button
                                    onClick={handleFavToggle}
                                    className={clsx("p-3 rounded-full transition-all hover:scale-110", isFav ? (appearance === 'light' ? "text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "text-primary shadow-[0_0_10px_rgba(var(--md-sys-color-primary),0.5)]") : "bg-white/5 text-on-surface-variant hover:bg-white/10")}
                                >
                                    <Heart size={20} fill={isFav ? "currentColor" : "none"} />
                                </button>
                                <button onClick={toggleShuffle} className={clsx("p-3 rounded-full transition-all hover:scale-110", shuffle ? "bg-primary text-on-primary shadow-lg shadow-primary/30" : "bg-white/5 text-on-surface-variant hover:bg-white/10")}>
                                    <Shuffle size={20} />
                                </button>
                                <button onClick={prev} className="p-3 text-on-background hover:text-primary transition-all hover:scale-110 rounded-full hover:bg-white/5"><SkipBack size={36} fill="currentColor" /></button>
                                <button
                                    onClick={isPlaying ? pause : () => play()}
                                    className="w-20 h-20 bg-primary text-on-primary rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_10px_30px_rgba(var(--md-sys-color-primary),0.4)]"
                                >
                                    {isPlaying ? <Pause size={40} fill="currentColor" /> : <Play size={40} className="ml-1.5" fill="currentColor" />}
                                </button>
                                <button onClick={next} className="p-3 text-on-background hover:text-primary transition-all hover:scale-110 rounded-full hover:bg-white/5"><SkipForward size={36} fill="currentColor" /></button>
                                <button onClick={toggleLoop} className={clsx("p-3 rounded-full transition-all hover:scale-110 relative", loop !== 'none' ? "bg-primary text-on-primary shadow-lg shadow-primary/30" : "bg-white/5 text-on-surface-variant hover:bg-white/10")}>
                                    <Repeat size={20} />
                                    {loop === 'one' && <span className="absolute top-2 right-2 text-[8px] font-black bg-white text-primary rounded-full w-3 h-3 flex items-center justify-center">1</span>}
                                </button>
                                <div className="relative" ref={!isFullScreenViz ? playlistPopupRef : null}>
                                    <button
                                        onClick={async () => {
                                            if (!showPlaylistPopup) {
                                                const all = await window.ipcRenderer.invoke('playlist:getAll');
                                                setPlaylists(all);
                                            }
                                            setShowPlaylistPopup(!showPlaylistPopup);
                                        }}
                                        className={clsx("p-3 rounded-full transition-all hover:scale-110", showPlaylistPopup ? (appearance === 'light' ? "bg-white/20 text-white shadow-[0_0_10px_rgba(255,255,255,0.3)]" : "bg-primary text-on-primary shadow-[0_0_10px_rgba(var(--md-sys-color-primary),0.5)]") : "bg-white/5 text-on-surface-variant hover:bg-white/10")}
                                    >
                                        <Plus size={20} />
                                    </button>
                                    <AnimatePresence>
                                        {showPlaylistPopup && !isFullScreenViz && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className="absolute bottom-full right-0 mb-4 w-56 bg-primary rounded-2xl shadow-[0_10px_40px_rgba(var(--md-sys-color-primary),0.5)] z-[100] outline outline-1 outline-white/20 border-2 border-white/10 overflow-hidden flex flex-col text-on-primary"
                                            >
                                                <div className="px-4 py-3 bg-black/10 border-b border-white/10 flex flex-col items-center">
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-on-primary">Playlists</h4>
                                                </div>
                                                <div className="max-h-60 overflow-y-auto no-scrollbar flex flex-col p-2 space-y-1">
                                                    {playlists.length > 0 ? playlists.map((pl) => (
                                                        <button
                                                            key={pl.id}
                                                            onClick={async () => {
                                                                if (currentTrack?.id) {
                                                                    await addTrackToPlaylist(pl.id, currentTrack.id);
                                                                    (window as any).showToast?.(`${currentTrack.title} added to playlist!`);
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
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Tabs & Content (50% Width) */}
                <div className="flex-1 relative flex flex-col">
                    {/* Tabs Header */}
                    <div className="flex items-center justify-center gap-12 p-6 border-b border-white/5 shrink-0">
                        <button
                            onClick={() => setActiveTab('lyrics')}
                            className={clsx("text-sm font-black uppercase tracking-widest pb-2 border-b-2 transition-all", activeTab === 'lyrics' ? "text-on-background border-primary" : "text-on-surface-variant/40 border-transparent hover:text-on-surface-variant")}
                        >
                            Lyrics
                        </button>
                        <button
                            onClick={() => setActiveTab('queue')}
                            className={clsx("text-sm font-black uppercase tracking-widest pb-2 border-b-2 transition-all", activeTab === 'queue' ? "text-on-background border-primary" : "text-on-surface-variant/40 border-transparent hover:text-on-surface-variant")}
                        >
                            Songs Queue
                        </button>
                    </div>

                    {/* Content Body */}
                    <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
                        {/* Lyrics Content */}
                        {activeTab === 'lyrics' && (
                            <div className="text-center h-full flex flex-col scrollbar-hide overflow-y-auto">
                                {lyrics ? (
                                    lyrics.isSynced ? (
                                        <div className="space-y-10 py-[40vh]" ref={lyricsContainerRef}>
                                            {Array.isArray(lyrics?.syncedLyrics) && lyrics.syncedLyrics.map((line: any, i: number) => {
                                                const isActive = currentTime >= line.seconds && (!lyrics.syncedLyrics[i + 1] || currentTime < lyrics.syncedLyrics[i + 1].seconds);
                                                return (
                                                    <p
                                                        key={i}
                                                        className={clsx(
                                                            "text-3xl font-black transition-all duration-700 cursor-pointer tracking-tight leading-tight px-4",
                                                            isActive ? "text-primary scale-110 opacity-100 drop-shadow-[0_0_20px_rgba(var(--md-sys-color-primary),0.3)]" : "text-on-surface-variant/20 hover:text-on-surface-variant/50 scale-95 origin-center"
                                                        )}
                                                        onClick={() => seek(line.seconds)}
                                                    >
                                                        {line.content}
                                                    </p>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="whitespace-pre-wrap text-2xl font-black text-primary/60 leading-relaxed py-12 tracking-tighter px-8">{lyrics.plainLyrics}</p>
                                    )
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-white/20 px-8">
                                        {loadingLyrics ? (
                                            <>
                                                <Mic2 size={64} className="mb-6 animate-pulse" />
                                                <p className="text-xl font-black uppercase tracking-widest">Finding Lyrics...</p>
                                            </>
                                        ) : (
                                            <div className="w-full max-w-sm flex flex-col gap-4 animate-in fade-in zoom-in duration-300">
                                                <div className="text-center mb-4">
                                                    <Mic2 size={48} className="mx-auto mb-2 text-primary opacity-50" />
                                                    <h3 className="text-lg font-bold text-on-background">No lyrics found</h3>
                                                    <p className="text-xs text-on-surface-variant">Search manually below</p>
                                                </div>

                                                <div className="space-y-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Song Title"
                                                        value={searchForm.title}
                                                        onChange={(e) => setSearchForm({ ...searchForm, title: e.target.value })}
                                                        className="w-full bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-sm text-on-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Artist Name"
                                                        value={searchForm.artist}
                                                        onChange={(e) => setSearchForm({ ...searchForm, artist: e.target.value })}
                                                        className="w-full bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-sm text-on-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Album Name (Optional)"
                                                        value={searchForm.album}
                                                        onChange={(e) => setSearchForm({ ...searchForm, album: e.target.value })}
                                                        className="w-full bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-sm text-on-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                    />
                                                </div>

                                                <button
                                                    onClick={handleManualSearch}
                                                    className="w-full py-3 bg-primary text-on-primary font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                                                >
                                                    <RefreshCw size={16} /> Search Lyrics
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Queue Content */}
                        {activeTab === 'queue' && (
                            <div className="space-y-8">
                                <div className="flex items-center justify-between h-14">
                                    <div>
                                        <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest mb-1">Playing From</p>
                                        <h3 className="text-lg font-black text-on-background">Current Queue</h3>
                                    </div>
                                </div>

                                {/* Current Playing Track (Highlighted) */}
                                <div className={clsx("p-4 rounded-2xl flex items-center gap-4 border outline outline-2 outline-primary", appearance === 'light' ? "bg-primary/10 border-primary/20 shadow-[0_5px_20px_rgba(var(--md-sys-color-primary),0.15)]" : "bg-primary/20 border-primary/30 shadow-[0_5px_20px_rgba(var(--md-sys-color-primary),0.3)]")}>
                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-primary/20 flex-shrink-0 relative shadow-inner">
                                        {currentTrack.image_path || currentTrack.thumbnail ? (
                                            <img src={currentTrack.image_path?.startsWith('http') ? currentTrack.image_path : currentTrack.image_path ? toAtmusicUrl(currentTrack.image_path) : currentTrack.thumbnail} className="w-full h-full object-cover" />
                                        ) : <Music2 size={20} className="absolute inset-0 m-auto text-primary/50" />}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                            <div className="w-8 h-8 flex items-center justify-center">
                                                <div className="w-1 h-3 bg-primary animate-music-bar-1 mx-[1px]" />
                                                <div className="w-1 h-4 bg-primary animate-music-bar-2 mx-[1px]" />
                                                <div className="w-1 h-2 bg-primary animate-music-bar-3 mx-[1px]" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="overflow-hidden flex-1">
                                        <h4 className="font-bold truncate text-sm text-primary drop-shadow-sm" title={currentTrack.title}>{truncateTitle(currentTrack.title)}</h4>
                                        <p className="text-xs text-primary/80 truncate">{currentTrack.artist}</p>
                                    </div>
                                    <p className="text-xs font-mono text-primary/60">{formatTime(duration)}</p>
                                </div>

                                {/* Queue List */}
                                <div className="mt-6 mb-2 px-2 flex items-center justify-between">
                                    <h4 className={clsx("text-[10px] font-black uppercase tracking-[0.2em]", appearance === 'light' ? "text-primary" : "text-primary/80")}>Up Next</h4>
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
                                            const isFavOfItem = isFavorite(id);
                                            return (
                                                <ZenQueueItem
                                                    key={track.id + '-' + i}
                                                    track={track}
                                                    i={i}
                                                    isFav={isFavOfItem}
                                                    play={play}
                                                    removeFromQueue={removeFromQueue}
                                                    addFavorite={addFavorite}
                                                    removeFavorite={removeFavorite}
                                                    appearance={appearance}
                                                    queue={queue}
                                                    reorderQueue={reorderQueue}
                                                />
                                            )
                                        })
                                    ) : (
                                        <div className="py-12 text-center text-on-surface-variant/30">
                                            <ListMusic size={40} className="mx-auto mb-4 opacity-50" />
                                            <p className="text-xs font-black uppercase tracking-widest">Queue is empty</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Full Screen Visualizer Overlay */}
            <AnimatePresence>
                {isFullScreenViz && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[100] bg-background flex flex-col overflow-hidden"
                    >
                        <BackgroundWatermarks />

                        {/* Visualizer Container (Bottom 42%) */}
                        <div className="absolute bottom-0 left-0 right-0 h-[42%] z-0 flex items-end justify-center w-full opacity-80 pointer-events-none select-none overflow-hidden">
                            <canvas
                                ref={canvasRef}
                                className="w-full h-full drop-shadow-[0_0_100px_rgba(var(--md-sys-color-primary),0.8)] mix-blend-screen object-contain scale-[1.2] origin-bottom"
                                width={1920}
                                height={1080}
                            />
                        </div>

                        {/* Top Bar: Title, Volume, Viz/Exit */}
                        <div className="flex items-center justify-between p-6 bg-gradient-to-b from-background/90 via-background/50 to-transparent z-20">
                            {/* Left Controls: Viz + Volume */}
                            <div className="bg-transparent flex items-center gap-6 z-50">
                                {/* Visualizer Selector */}
                                <div className="flex bg-surface-variant/10 rounded-full p-1 border border-primary/20 backdrop-blur-sm outline outline-1 outline-primary/40 outline-offset-[-1px] shadow-lg">
                                    <button onClick={() => setVizMode('wave')} className={clsx("p-2 rounded-full transition-all", vizMode === 'wave' ? "bg-primary text-on-primary shadow-[0_0_15px_rgba(var(--md-sys-color-primary),0.8)]" : "text-primary/50 hover:text-primary")} title="Wave">
                                        <Activity size={18} />
                                    </button>
                                    <button onClick={() => setVizMode('piano')} className={clsx("p-2 rounded-full transition-all", vizMode === 'piano' ? "bg-primary text-on-primary shadow-[0_0_15px_rgba(var(--md-sys-color-primary),0.8)]" : "text-primary/50 hover:text-primary")} title="Piano">
                                        <ListMusic size={18} className="rotate-90" />
                                    </button>
                                    <button onClick={() => setVizMode('isometric')} className={clsx("p-2 rounded-full transition-all", vizMode === 'isometric' ? "bg-primary text-on-primary shadow-[0_0_15px_rgba(var(--md-sys-color-primary),0.8)]" : "text-primary/50 hover:text-primary")} title="Isometric">
                                        <Box size={18} />
                                    </button>
                                    <button onClick={() => setVizMode('dna')} className={clsx("p-2 rounded-full transition-all", vizMode === 'dna' ? "bg-primary text-on-primary shadow-[0_0_15px_rgba(var(--md-sys-color-primary),0.8)]" : "text-primary/50 hover:text-primary")} title="DNA">
                                        <Dna size={18} />
                                    </button>
                                    <button onClick={() => setVizMode('geometry')} className={clsx("p-2 rounded-full transition-all", vizMode === 'geometry' ? "bg-primary text-on-primary shadow-[0_0_15px_rgba(var(--md-sys-color-primary),0.8)]" : "text-primary/50 hover:text-primary")} title="Geometry">
                                        <Hexagon size={18} />
                                    </button>
                                    <button onClick={() => setVizMode('solar')} className={clsx("p-2 rounded-full transition-all", vizMode === 'solar' ? "bg-primary text-on-primary shadow-[0_0_15px_rgba(var(--md-sys-color-primary),0.8)]" : "text-primary/50 hover:text-primary")} title="Solar">
                                        <Sun size={18} />
                                    </button>
                                </div>

                                {/* Android-Style Volume Slider */}
                                <div className="flex items-center gap-3 group bg-surface-variant/10 rounded-full pl-3 pr-4 py-1.5 border border-primary/20 backdrop-blur-sm outline outline-1 outline-primary/40 outline-offset-[-1px] shadow-lg">
                                    <button onClick={toggleMute} className={clsx("hover:scale-110 transition-all", appearance === 'light' ? "text-primary hover:text-primary/80" : "text-white hover:text-primary")}>
                                        {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                    </button>
                                    <div className="relative w-32 h-6 flex items-center">
                                        <input
                                            type="range"
                                            min={0} max={1} step={0.01}
                                            value={volume}
                                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <div className={clsx("w-full h-1.5 rounded-full overflow-hidden", appearance === 'light' ? "bg-primary/20" : "bg-white/20")}>
                                            <div
                                                className={clsx("h-full transition-all duration-100 ease-out", appearance === 'light' ? "bg-primary shadow-[0_0_10px_rgba(var(--md-sys-color-primary),0.8)]" : "bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]")}
                                                style={{ width: `${volume * 100}%` }}
                                            />
                                        </div>
                                        <div
                                            className={clsx("h-3 w-3 rounded-full absolute pointer-events-none transition-all duration-100 ease-out", appearance === 'light' ? "bg-primary shadow-[0_0_10px_rgba(var(--md-sys-color-primary),1)]" : "bg-white shadow-[0_0_10px_rgba(255,255,255,1)]")}
                                            style={{ left: `calc(${volume * 100}% - 6px)` }}
                                        />
                                    </div>
                                    <span className={clsx("text-xs font-bold w-8 text-right tabular-nums", appearance === 'light' ? "text-primary" : "text-white")}>
                                        {Math.round(volume * 100)}%
                                    </span>
                                </div>
                            </div>

                            {/* Title (Center) */}
                            <div className={clsx("absolute left-1/2 -translate-x-1/2 top-4 flex flex-col items-center px-10 py-3 rounded-3xl border backdrop-blur-2xl shadow-2xl min-w-[350px] z-50 transition-transform duration-300 hover:scale-105", appearance === 'light' ? "border-primary/20 bg-white/60" : "border-white/10 bg-black/40")}>
                                <h2 className={clsx("text-2xl font-black leading-tight text-center line-clamp-1", appearance === 'light' ? "text-primary drop-shadow-sm" : "text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]")} title={currentTrack.title}>{truncateTitle(currentTrack.title)}</h2>
                                <p className={clsx("text-[11px] font-black uppercase tracking-[0.2em] mt-1 text-center line-clamp-1", appearance === 'light' ? "text-primary/70" : "text-white/70")}>{currentTrack.artist}</p>
                            </div>

                            {/* Controls (Right) */}
                            <div className="flex items-center gap-4 justify-end z-50">
                                <div className={clsx("flex items-center gap-2 bg-surface-variant/10 rounded-full px-5 py-[-2] border backdrop-blur-xl shadow-2xl outline outline-1 outline-primary/40 outline-offset-[-1px]", appearance === 'light' ? "border-primary/20" : "border-white/5")}>
                                    <button onClick={handleFavToggle} className={clsx("p-2 transition-all hover:scale-110", isFav ? (appearance === 'light' ? "text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" : "text-primary drop-shadow-[0_0_10px_rgba(var(--md-sys-color-primary),0.8)]") : (appearance === 'light' ? "text-primary/40 hover:text-primary" : "text-white/40 hover:text-white"))}>
                                        <Heart size={18} fill={isFav ? "currentColor" : "none"} />
                                    </button>
                                    <button onClick={toggleShuffle} className={clsx("p-2 transition-all hover:scale-110", shuffle ? "text-primary drop-shadow-[0_0_10px_rgba(var(--md-sys-color-primary),0.8)]" : (appearance === 'light' ? "text-primary/40 hover:text-primary" : "text-white/40 hover:text-white"))}><Shuffle size={18} /></button>
                                    <button onClick={prev} className={clsx("p-2 transition-all hover:scale-110", appearance === 'light' ? "text-primary/60 hover:text-primary" : "text-white/60 hover:text-white")}><SkipBack size={20} fill="currentColor" /></button>
                                    <button
                                        onClick={isPlaying ? pause : () => play()}
                                        className={clsx("w-12 h-12 rounded-full flex items-center justify-center hover:scale-110 transition-all border mx-1", appearance === 'light' ? "bg-primary text-on-primary shadow-[0_0_20px_rgba(var(--md-sys-color-primary),0.5)] border-primary/10" : "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.5)] border-black/10")}
                                    >
                                        {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                                    </button>
                                    <button onClick={next} className={clsx("p-2 transition-all hover:scale-110", appearance === 'light' ? "text-primary/60 hover:text-primary" : "text-white/60 hover:text-white")}><SkipForward size={20} fill="currentColor" /></button>
                                    <button onClick={toggleLoop} className={clsx("p-2 transition-all hover:scale-110 relative", loop !== 'none' ? "text-primary drop-shadow-[0_0_10px_rgba(var(--md-sys-color-primary),0.8)]" : (appearance === 'light' ? "text-primary/40 hover:text-primary" : "text-white/40 hover:text-white"))}>
                                        <Repeat size={18} />
                                        {loop === 'one' && <span className="absolute top-1 right-1 text-[7px] font-black bg-primary text-on-primary rounded-full w-2.5 h-2.5 flex items-center justify-center">1</span>}
                                    </button>
                                    <div className="relative" ref={isFullScreenViz ? playlistPopupRef : null}>
                                        <button
                                            onClick={async () => {
                                                if (!showPlaylistPopup) {
                                                    const all = await window.ipcRenderer.invoke('playlist:getAll');
                                                    setPlaylists(all);
                                                }
                                                setShowPlaylistPopup(!showPlaylistPopup);
                                            }}
                                            className={clsx("p-2 transition-all hover:scale-110", showPlaylistPopup ? (appearance === 'light' ? "text-white bg-white/20 shadow-[0_0_10px_rgba(255,255,255,0.3)]" : "text-primary drop-shadow-[0_0_10px_rgba(var(--md-sys-color-primary),0.8)]") : (appearance === 'light' ? "text-primary/40 hover:text-primary" : "text-white/40 hover:text-white"))}
                                        >
                                            <Plus size={18} />
                                        </button>
                                        <AnimatePresence>
                                            {showPlaylistPopup && isFullScreenViz && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    className="absolute top-full right-0 mt-4 w-56 bg-primary rounded-2xl shadow-[0_10px_40px_rgba(var(--md-sys-color-primary),0.5)] z-[100] outline outline-1 outline-white/20 border-2 border-white/10 overflow-hidden flex flex-col text-on-primary"
                                                >
                                                    <div className="px-4 py-3 bg-black/10 border-b border-white/10 flex flex-col items-center">
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-on-primary">Playlists</h4>
                                                    </div>
                                                    <div className="max-h-60 overflow-y-auto no-scrollbar flex flex-col p-2 space-y-1">
                                                        {playlists.length > 0 ? playlists.map((pl) => (
                                                            <button
                                                                key={pl.id}
                                                                onClick={async () => {
                                                                    if (currentTrack?.id) {
                                                                        await addTrackToPlaylist(pl.id, currentTrack.id);
                                                                        (window as any).showToast?.(`${currentTrack.title} added to playlist!`);
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
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                {/* Queue Button & Popup */}
                                <div className="relative" ref={queuePopupRef}>
                                    <button
                                        onClick={() => setShowQueuePopup(!showQueuePopup)}
                                        className={clsx(
                                            "p-3 rounded-full transition-all backdrop-blur-md outline outline-1 transition-all",
                                            showQueuePopup ? (appearance === 'light' ? "bg-white/20 text-white outline-white/30 shadow-[0_0_20px_rgba(255,255,255,0.6)]" : "bg-primary text-on-primary outline-primary shadow-[0_0_20px_rgba(var(--md-sys-color-primary),0.6)]") : (appearance === 'light' ? "bg-primary/5 text-primary/60 outline-primary/20 hover:outline-primary hover:text-primary shadow-lg" : "bg-white/5 text-white/60 outline-white/10 hover:outline-primary hover:text-primary shadow-lg")
                                        )}
                                    >
                                        <ListMusic size={20} />
                                    </button>
                                    <AnimatePresence>
                                        {showQueuePopup && (
                                            <motion.div
                                                initial={{ x: '100%' }}
                                                animate={{ x: 0 }}
                                                exit={{ x: '100%' }}
                                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                                className="fixed top-0 right-0 h-full w-[26%] bg-primary shadow-[-20px_0_50px_rgba(var(--md-sys-color-primary),0.3)] z-[100] outline outline-1 outline-white/20 border-l border-white/10 flex flex-col text-on-primary"
                                            >
                                                <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
                                                    <div className="flex items-center gap-2">
                                                        <ListMusic size={20} className="text-on-primary" />
                                                        <h4 className="text-lg font-black uppercase tracking-widest text-on-primary">Up Next</h4>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {queue && queue.length > 0 && (
                                                            <button
                                                                onClick={clearQueue}
                                                                className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-white/20 text-on-primary/70 hover:text-white hover:border-white/50 hover:bg-white/10 transition-colors"
                                                            >
                                                                Clear
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setShowQueuePopup(false)}
                                                            className="p-2 hover:bg-white/10 rounded-full text-on-primary/70 hover:text-white transition-colors"
                                                        >
                                                            <X size={20} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-1">
                                                    {queue && queue.length > 0 ? (
                                                        queue.map((track: any, i: number) => {
                                                            const id = track.id?.toString() || track.id;
                                                            const isFavOfItem = isFavorite(id);
                                                            return (
                                                                <MiniQueueItem
                                                                    key={track.id + '-' + i}
                                                                    track={track}
                                                                    i={i}
                                                                    isFav={isFavOfItem}
                                                                    play={play}
                                                                    removeFromQueue={removeFromQueue}
                                                                    addFavorite={addFavorite}
                                                                    removeFavorite={removeFavorite}
                                                                    setShowQueuePopup={setShowQueuePopup}
                                                                    appearance={appearance}
                                                                    queue={queue}
                                                                    reorderQueue={reorderQueue}
                                                                />
                                                            )
                                                        })
                                                    ) : (
                                                        <div className="h-full flex flex-col items-center justify-center text-on-primary/30 py-20">
                                                            <ListMusic size={64} className="mb-4 opacity-50" />
                                                            <p className="text-sm font-black uppercase tracking-widest">Queue is empty</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>


                                <button onClick={() => setIsFullScreenViz(false)} className="p-3 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-full transition-all backdrop-blur-sm border border-red-500/30 shadow-lg">
                                    <Minimize2 size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Interactive Content Wrapper to keep it above Visualizer */}
                        <div className="flex-1 flex flex-col w-full relative z-20 pt-[115px]" style={{ paddingBottom: 'calc(42vh + 20px)' }}>
                            {/* Middle: Progress Bar (Moved to Top) */}
                            <div className="w-full flex justify-center shrink-0 mb-6 z-20 pointer-events-auto">
                                <div className="w-full max-w-[806px] transition-all duration-300">
                                    <div className="flex items-center justify-between mb-4 text-[12px] font-black uppercase tracking-[0.2em]">
                                        <span className={appearance === 'light' ? "text-primary/70" : "text-white/70"}>{(() => {
                                            const s = isDraggingSlider ? sliderValue : currentTime;
                                            const m = Math.floor(s / 60);
                                            const sec = Math.floor(s % 60);
                                            return `${m}:${sec.toString().padStart(2, '0')}`;
                                        })()}</span>
                                        <span className={appearance === 'light' ? "text-primary/70" : "text-white/70"}>{(() => {
                                            const m = Math.floor(duration / 60);
                                            const sec = Math.floor(duration % 60);
                                            return `${m}:${sec.toString().padStart(2, '0')}`;
                                        })()}</span>
                                    </div>
                                    <div className="relative h-8 flex items-center cursor-pointer">
                                        <input
                                            type="range"
                                            min={0}
                                            max={duration || 100}
                                            value={isDraggingSlider ? sliderValue : currentTime}
                                            onChange={(e) => {
                                                setSliderValue(parseFloat(e.target.value));
                                                if (!isDraggingSlider) setIsDraggingSlider(true);
                                            }}
                                            onMouseDown={() => setIsDraggingSlider(true)}
                                            onMouseUp={(e) => {
                                                setIsDraggingSlider(false);
                                                seek(parseFloat((e.target as HTMLInputElement).value));
                                            }}
                                            onTouchStart={() => setIsDraggingSlider(true)}
                                            onTouchEnd={(e) => {
                                                setIsDraggingSlider(false);
                                                seek(parseFloat((e.target as HTMLInputElement).value));
                                            }}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                        />
                                        {/* Primary Color Outlined Track */}
                                        <div className={clsx("w-full h-1.5 rounded-full overflow-hidden backdrop-blur-md outline outline-1 outline-primary/50 shadow-[0_0_20px_rgba(var(--md-sys-color-primary),0.4)]", appearance === 'light' ? "bg-primary/10" : "bg-white/10")}>
                                            <div
                                                className="h-full bg-primary transition-all duration-100 ease-linear shadow-[0_0_20px_rgba(var(--md-sys-color-primary),1)]"
                                                style={{ width: `${((isDraggingSlider ? sliderValue : currentTime) / (duration || 1)) * 100}%` }}
                                            />
                                        </div>
                                        {/* Primary Color Outlined Thumb */}
                                        <div
                                            className={clsx(
                                                "absolute h-5 w-5 rounded-full transition-all duration-200 pointer-events-none z-10 border border-black/10 shadow-[0_0_25px_rgba(var(--md-sys-color-primary),1)] outline outline-1 outline-primary",
                                                isDraggingSlider ? "scale-150" : "group-hover:scale-125 scale-100",
                                                appearance === 'light' ? "bg-primary text-primary border-primary/10" : "bg-white"
                                            )}
                                            style={{ left: `calc(${((isDraggingSlider ? sliderValue : currentTime) / (duration || 1)) * 100}% - 10px)` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Bottom: Floating Lyrics Display */}
                            <div className="w-full px-8 flex flex-col items-center pointer-events-none">
                                <div className={clsx("w-full max-w-6xl text-center flex flex-col items-center transition-all duration-500 backdrop-blur-md outline outline-1 rounded-[3rem] p-12", appearance === 'light' ? "bg-white/50 outline-primary/30 shadow-[0_20px_50px_rgba(var(--md-sys-color-primary),0.15)]" : "bg-black/20 outline-primary/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)]")}>
                                    {lyrics?.syncedLyrics ? (
                                        (() => {
                                            const activeIndex = lyrics.syncedLyrics.findIndex((line: any, index: number) => {
                                                const nextLine = lyrics.syncedLyrics[index + 1];
                                                return currentTime >= line.seconds && (!nextLine || currentTime < nextLine.seconds);
                                            });
                                            const currentLine = activeIndex !== -1 ? lyrics.syncedLyrics[activeIndex] : null;
                                            const nextLine = activeIndex !== -1 && lyrics.syncedLyrics[activeIndex + 1] ? lyrics.syncedLyrics[activeIndex + 1] : lyrics.syncedLyrics[0];

                                            return (
                                                <div className="space-y-6">
                                                    <p className={clsx("text-4xl md:text-5xl font-black leading-tight drop-shadow-[0_10px_30px_rgba(var(--md-sys-color-primary),0.8)] [-webkit-text-stroke:1px_rgba(var(--md-sys-color-primary),0.6)] px-4", appearance === 'light' ? "text-primary" : "text-white")}>
                                                        {currentLine ? currentLine.content : "..."}
                                                    </p>
                                                    <p className={clsx("text-2xl md:text-3xl font-bold drop-shadow-[0_5px_15px_rgba(var(--md-sys-color-primary),0.4)] [-webkit-text-stroke:1px_rgba(var(--md-sys-color-primary),0.2)] px-4", appearance === 'light' ? "text-primary/60" : "text-white/60")}>
                                                        {nextLine ? nextLine.content : ""}
                                                    </p>
                                                </div>
                                            )
                                        })()
                                    ) : (
                                        <p className={clsx("text-4xl font-bold italic drop-shadow-2xl", appearance === 'light' ? "text-primary/50" : "text-white/30")}>
                                            {lyrics?.plainLyrics ? "Lyrics available in tab" : "Instrumental / No Lyrics"}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default NowPlaying;
