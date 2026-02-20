
import { useEffect, useState } from 'react';
import { Play, ChevronLeft, ChevronRight, History, Trash2 } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { motion, AnimatePresence } from 'framer-motion';

const PlaybackHistory = () => {
    const [history, setHistory] = useState<any[]>([]);
    const [page, setPage] = useState(0);
    const { play } = usePlayerStore();
    const itemsPerPage = 40;
    const maxItems = 120;

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                // Fetch up to 120 songs
                const data = await window.ipcRenderer.invoke('library:getRecentlyPlayed', maxItems);
                setHistory(data);
            } catch (err) {
                console.error("Failed to fetch history", err);
            }
        };
        fetchHistory();
    }, []);

    const handleClearHistory = async () => {
        if (!confirm('Are you sure you want to clear your playback history?')) return;
        try {
            await window.ipcRenderer.invoke('library:clearHistory');
            setHistory([]);
            setPage(0);
        } catch (err) {
            console.error("Failed to clear history", err);
        }
    };

    const totalPages = Math.ceil(Math.min(history.length, maxItems) / itemsPerPage);
    const paginatedItems = history.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

    const formatTime = (seconds: number) => {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 space-y-8"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
                        <History size={32} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter text-on-background">Playback History</h1>
                        <p className="text-on-surface-variant/60 font-medium">Your last {history.length} songs</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {totalPages > 1 && (
                        <div className="flex items-center gap-4 bg-surface-variant/10 p-2 rounded-full border border-white/5">
                            <button
                                disabled={page === 0}
                                onClick={() => setPage(page - 1)}
                                className="p-2 disabled:opacity-20 text-on-background hover:bg-primary hover:text-on-primary rounded-full transition-all"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <span className="text-xs font-black uppercase tracking-widest px-2">Page {page + 1} of {totalPages}</span>
                            <button
                                disabled={page === totalPages - 1}
                                onClick={() => setPage(page + 1)}
                                className="p-2 disabled:opacity-20 text-on-background hover:bg-primary hover:text-on-primary rounded-full transition-all"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    )}

                    <button
                        onClick={handleClearHistory}
                        className="flex items-center gap-2 px-6 py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-full transition-all font-bold uppercase tracking-widest text-[10px] border border-red-500/20 shadow-lg shadow-red-500/10"
                    >
                        <Trash2 size={16} /> Clear History
                    </button>
                </div>
            </div>

            <div className="bg-surface/40 backdrop-blur-xl rounded-[2.5rem] border border-white/5 overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">
                            <th className="px-8 py-6 w-16">#</th>
                            <th className="px-4 py-6">Title</th>
                            <th className="px-4 py-6">Album</th>
                            <th className="px-4 py-6 text-right pr-8">Duration</th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence mode="popLayout">
                            {paginatedItems.map((track, i) => (
                                <motion.tr
                                    key={`${track.id}-${page}-${i}`}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ delay: i * 0.02 }}
                                    onClick={() => play(track)}
                                    className="group hover:bg-primary/5 cursor-pointer transition-colors border-b border-white/5 last:border-0"
                                >
                                    <td className="px-8 py-4 text-xs font-black text-on-surface-variant/40 group-hover:text-primary transition-colors">
                                        {(page * itemsPerPage) + i + 1}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-surface-variant">
                                                {track.image_path ? (
                                                    <img src={track.image_path.startsWith('http') ? track.image_path : `atmusic://${track.image_path}`} className="w-full h-full object-cover" />
                                                ) : <div className="w-full h-full flex items-center justify-center"><Play size={16} className="text-primary/20" /></div>}
                                            </div>
                                            <div>
                                                <p className="font-bold text-on-background group-hover:text-primary transition-colors truncate max-w-[200px]">{track.title}</p>
                                                <p className="text-xs text-on-surface-variant/60 font-medium truncate max-w-[200px]">{track.artist}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-sm text-on-surface-variant/60 font-medium truncate max-w-[200px]">
                                        {track.album || 'Unknown Album'}
                                    </td>
                                    <td className="px-4 py-4 text-right pr-8 font-mono text-xs text-on-surface-variant/40">
                                        {formatTime(track.duration)}
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
                {history.length === 0 && (
                    <div className="py-24 text-center">
                        <History size={48} className="mx-auto mb-4 text-on-surface-variant/10" />
                        <p className="text-on-surface-variant/40 font-bold italic">Your music history is empty</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default PlaybackHistory;
