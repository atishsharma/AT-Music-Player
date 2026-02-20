
import { useRef, useEffect } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { X, Mic2, ListMusic, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

const SidebarOverlay = () => {
    const {
        isSidebarQueueOpen,
        isSidebarLyricsOpen,
        toggleSidebarQueue,
        toggleSidebarLyrics,
        lyrics,
        currentTrack,
        queue,
        next,
        currentTime,
        seek
    } = usePlayerStore() as any;

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

    const formatTime = (seconds: number) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

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
                                                    <img src={currentTrack.image_path?.startsWith('http') ? currentTrack.image_path : currentTrack.image_path ? `atmusic://${currentTrack.image_path}` : currentTrack.thumbnail} className="w-full h-full object-cover" />
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
                                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-4">Up Next</p>
                                    <div className="space-y-2">
                                        {queue && queue.length > 0 ? (
                                            queue.map((track: any, i: number) => (
                                                <div
                                                    key={i}
                                                    className="group p-4 pb-3 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-colors cursor-pointer"
                                                    onClick={() => next()}
                                                >
                                                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 relative flex-shrink-0 shadow-lg">
                                                        {track.image_path || track.thumbnail ? (
                                                            <img src={track.image_path?.startsWith('http') ? track.image_path : track.image_path ? `atmusic://${track.image_path}` : track.thumbnail} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                                        ) : <div className="w-full h-full flex items-center justify-center"><ListMusic size={20} /></div>}
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                                                            <Play size={20} fill="currentColor" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0 pr-2">
                                                        <h4 className="text-sm font-bold truncate text-on-background group-hover:text-primary transition-colors">{track.title}</h4>
                                                        <p className="text-xs text-on-surface-variant truncate">{track.artist}</p>
                                                    </div>
                                                    <span className="text-[10px] font-mono opacity-40 ml-1">{formatTime(track.duration)}</span>
                                                </div>
                                            ))
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
