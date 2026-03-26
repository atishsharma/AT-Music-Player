import { useEffect, useState, useCallback } from 'react';
import { useDownloadStore } from '../store/downloadStore';
import { Download, XCircle, CheckCircle, AlertCircle, Loader2, Trash2, Link2, Music2, Library, Type, Image as ImageIcon, X } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { YtDlpFooter } from '../components/common/YtDlpFooter';

const Downloads = () => {
    const { downloads, setDownload, removeDownload } = useDownloadStore();
    const [searchParams, setSearchParams] = useSearchParams();
    const [url, setUrl] = useState(searchParams.get('url') || '');
    const [isFetchingInfo, setIsFetchingInfo] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [pendingTrack, setPendingTrack] = useState<any>(null);
    const [selectedFormat, setSelectedFormat] = useState('m4a');
    const [selectedFormatId, setSelectedFormatId] = useState<string | null>(null);
    const [customFilename, setCustomFilename] = useState('');
    const [embedThumbnail, setEmbedThumbnail] = useState(true);

    const downloadList = Object.values(downloads).sort((a, b) => {
        if (a.state === 'downloading' && b.state !== 'downloading') return -1;
        if (a.state !== 'downloading' && b.state === 'downloading') return 1;
        return 0;
    });

    const handleFetchInfo = useCallback(async (targetUrl: string) => {
        if (!targetUrl.trim()) return;

        try {
            setIsFetchingInfo(true);
            const info = await window.ipcRenderer.invoke('youtube:getInfo', targetUrl.trim());
            if (info) {
                setPendingTrack({
                    id: info.id || Date.now().toString(),
                    title: info.title,
                    artist: info.artist,
                    duration: info.duration,
                    thumbnail: info.thumbnail,
                    source: 'youtube',
                    formats: info.formats || []
                });
                setCustomFilename(info.title);
                // Select best m4a quality by default if available
                if (info.formats && info.formats.length > 0) {
                    const defaultFormat = info.formats.find((f: any) => f.extension === 'm4a') || info.formats[0];
                    setSelectedFormatId(defaultFormat.formatId);
                    setSelectedFormat(defaultFormat.extension === 'm4a' ? 'm4a' : 'mp3');
                }
                setShowConfirmDialog(true);
            } else {
                alert('Could not fetch video info. Please check the URL.');
            }
        } catch (err) {
            console.error('Fetch info failed:', err);
            alert('Failed to fetch info.');
        } finally {
            setIsFetchingInfo(false);
        }
    }, []);

    useEffect(() => {
        const queryUrl = searchParams.get('url');
        if (queryUrl) {
            setUrl(queryUrl);
            handleFetchInfo(queryUrl);
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('url');
            setSearchParams(newParams);
        }
    }, [searchParams, handleFetchInfo, setSearchParams]);

    useEffect(() => {
        if (!window.ipcRenderer) return;

        const removeListener = window.ipcRenderer?.on?.('download:update', (_event, data) => {
            setDownload(data);
        });
        return () => {
            if (removeListener) removeListener();
        };
    }, [setDownload]);

    const handleFetchAndDownload = async (e: React.FormEvent) => {
        e.preventDefault();
        handleFetchInfo(url);
    };

    const confirmDownload = async () => {
        if (!pendingTrack) return;
        try {
            await window.ipcRenderer.invoke('download:start', {
                track: pendingTrack,
                options: {
                    format: selectedFormat,
                    formatId: selectedFormatId,
                    quality: 'best',
                    customFilename,
                    embedThumbnail
                }
            });
            setUrl('');
            setShowConfirmDialog(false);
            setPendingTrack(null);
        } catch (err) {
            console.error('Start download failed:', err);
            alert('Failed to start download.');
        }
    };

    const handleCancel = async (id: string) => {
        await window.ipcRenderer.invoke('download:cancel', id);
    };

    const clearCompleted = () => {
        downloadList.forEach(item => {
            if (item.state === 'completed' || item.state === 'failed' || item.state === 'cancelled') {
                removeDownload(item.id);
            }
        });
    };

    const showDownloadedTracks = () => {
        window.location.hash = '#/library';
    };

    return (
        <div className="space-y-10 pb-32 max-w-7xl mx-auto px-4 pt-12">
            {/* Redesigned Title Bar */}
            <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md py-6 -mx-4 px-4 border-b border-white/5 flex flex-col md:flex-row items-center gap-8">
                <div className="flex flex-col md:flex-row items-center gap-6 flex-1 w-full">
                    <div className="flex items-center gap-4 shrink-0">
                        <div className="w-14 h-14 rounded-[1.25rem] bg-primary/10 flex items-center justify-center text-primary shadow-2xl shadow-primary/20 border border-primary/30 outline outline-1 outline-primary/20">
                            <Download size={28} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-primary tracking-tighter italic">
                                Downloads
                            </h1>
                            <p className="text-on-surface-variant font-medium text-[10px] tracking-[0.2em] opacity-60">Save Music Offline</p>
                        </div>
                    </div>

                    <form onSubmit={handleFetchAndDownload} className="relative flex-1 group no-drag w-full md:w-auto">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-primary group-focus-within:scale-110 transition-transform">
                            <Link2 size={20} />
                        </div>
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="Paste your source URL here..."
                            className="w-full h-14 pl-14 pr-32 rounded-full bg-surface-variant/20 border border-primary/20 outline outline-1 outline-primary/10 focus:outline-primary/40 focus:ring-4 focus:ring-primary/10 transition-all text-lg font-bold text-on-surface placeholder:text-on-surface-variant/30 shadow-lg"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            {isFetchingInfo && (
                                <div className="mr-2">
                                    <Loader2 size={20} className="animate-spin text-primary" />
                                </div>
                            )}
                            <button
                                type="submit"
                                disabled={isFetchingInfo || !url.trim()}
                                className={clsx(
                                    "px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50",
                                    "bg-primary text-on-primary hover:shadow-lg hover:shadow-primary/20"
                                )}
                            >
                                Get
                            </button>
                        </div>
                    </form>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {downloadList.length > 0 && (
                        <>
                            <button
                                onClick={showDownloadedTracks}
                                className="flex items-center gap-3 px-6 py-3.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-primary/20 active:scale-95"
                            >
                                <Library size={16} />
                                Library
                            </button>
                            <button
                                onClick={clearCompleted}
                                className="flex items-center gap-3 px-6 py-3.5 bg-surface-variant/20 hover:bg-red-500/10 hover:text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 active:scale-95"
                                title="Clear History"
                            >
                                <Trash2 size={16} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {
                downloadList.length === 0 ? (
                    <div className="text-center py-40 bg-surface-variant/10 rounded-[3rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center grayscale opacity-50">
                        <Download size={80} className="mb-6" />
                        <p className="text-2xl font-black uppercase tracking-[0.2em]">Queue is Empty</p>
                        <p className="mt-2 font-medium">Start downloading some tracks from Search!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {downloadList.map((item) => (
                            <div
                                key={item.id}
                                className={clsx(
                                    "group rounded-[2.5rem] p-6 flex flex-col md:flex-row items-start md:items-center gap-6 border transition-all duration-500",
                                    item.state === 'completed'
                                        ? "bg-green-500/10 border-green-500/20 shadow-lg shadow-green-500/5"
                                        : item.state === 'failed'
                                            ? "bg-red-500/10 border-red-500/20"
                                            : "bg-surface-variant/20 border-white/5 hover:bg-surface-variant/30"
                                )}
                            >
                                <div className={clsx(
                                    "h-16 w-16 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-2xl",
                                    item.state === 'completed' ? "bg-green-500 text-white" : "bg-primary text-on-primary"
                                )}>
                                    {item.state === 'downloading' ? (
                                        <Loader2 size={28} className="animate-spin" />
                                    ) : item.state === 'completed' ? (
                                        <CheckCircle size={28} />
                                    ) : (
                                        <Download size={28} />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0 space-y-3">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                        <h4 className="text-xl font-black text-on-background truncate leading-tight pr-4" title={item.title}>
                                            {item.title || `Download ${item.id}`}
                                        </h4>
                                        <div className="flex items-center gap-3">
                                            <span className={clsx(
                                                "text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full",
                                                item.state === 'completed' ? "bg-green-500/20 text-green-400" : "bg-primary/20 text-primary"
                                            )}>
                                                {item.state}
                                            </span>
                                            {item.state === 'downloading' && (
                                                <span className="text-sm font-black text-primary font-mono">{Math.round(item.progress)}%</span>
                                            )}
                                        </div>
                                    </div>

                                    {item.state === 'downloading' && (
                                        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden p-0.5">
                                            <div
                                                className="h-full bg-primary rounded-full transition-all duration-500 shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]"
                                                style={{ width: `${item.progress}%` }}
                                            />
                                        </div>
                                    )}

                                    {item.state === 'failed' && (
                                        <div className="flex items-center gap-2 text-red-400 text-sm font-bold bg-red-400/5 p-3 rounded-2xl border border-red-400/10">
                                            <AlertCircle size={16} />
                                            {item.error}
                                        </div>
                                    )}
                                </div>

                                <div className="shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {item.state === 'downloading' && (
                                        <button
                                            onClick={() => handleCancel(item.id)}
                                            className="p-4 bg-red-500 text-white rounded-2xl hover:bg-red-600 transition-all active:scale-90"
                                            title="Cancel"
                                        >
                                            <XCircle size={20} />
                                        </button>
                                    )}
                                    {(item.state === 'completed' || item.state === 'failed' || item.state === 'cancelled') && (
                                        <button
                                            onClick={() => removeDownload(item.id)}
                                            className="p-4 bg-surface-variant/60 text-on-surface-variant hover:text-red-400 rounded-2xl transition-all"
                                            title="Clear"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }

            {/* Advanced Download Dialog */}
            <AnimatePresence>
                {showConfirmDialog && pendingTrack && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowConfirmDialog(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-2xl bg-surface p-10 rounded-[4rem] border border-white/10 shadow-3xl overflow-hidden"
                        >
                            <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/20 blur-[120px] rounded-full" />
                            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-secondary/10 blur-[120px] rounded-full" />

                            <div className="relative space-y-10">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-3xl font-black uppercase tracking-tighter text-on-background">Download Setup</h3>
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Configure your high-quality export</p>
                                    </div>
                                    <button
                                        onClick={() => setShowConfirmDialog(false)}
                                        className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all active:scale-90"
                                    >
                                        <X size={24} className="text-on-surface-variant" />
                                    </button>
                                </div>

                                <div className="flex gap-8 items-start bg-white/5 p-6 rounded-[2.5rem] border border-white/5">
                                    <div className="w-32 h-32 rounded-3xl overflow-hidden shadow-2xl shrink-0 border border-white/10 relative group">
                                        <img src={pendingTrack.thumbnail} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="thumbnail" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                                    </div>
                                    <div className="flex-1 space-y-3 min-w-0 py-2">
                                        <h4 className="text-2xl font-black text-on-background truncate tracking-tight">{pendingTrack.title}</h4>
                                        <p className="text-on-surface-variant/60 font-bold uppercase tracking-widest text-xs">{pendingTrack.artist}</p>
                                        <div className="flex gap-3 pt-2">
                                            <span className="px-4 py-1.5 bg-primary/20 rounded-full text-[10px] font-black uppercase tracking-widest text-primary border border-primary/20">
                                                {Math.floor(pendingTrack.duration / 60)}:{(pendingTrack.duration % 60).toString().padStart(2, '0')}
                                            </span>
                                            <span className="px-4 py-1.5 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 border border-white/5">
                                                YouTube
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 ml-1">
                                            <Music2 size={12} /> Select Quality & Format
                                        </label>
                                        <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar pr-2">
                                            {pendingTrack.formats.length > 0 ? (
                                                pendingTrack.formats.map((f: any) => (
                                                    <button
                                                        key={f.formatId}
                                                        onClick={() => {
                                                            setSelectedFormatId(f.formatId);
                                                            setSelectedFormat(f.extension === 'm4a' ? 'm4a' : 'mp3');
                                                        }}
                                                        className={clsx(
                                                            "w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all group",
                                                            selectedFormatId === f.formatId
                                                                ? "bg-primary border-primary text-on-primary shadow-lg shadow-primary/20 scale-[1.02]"
                                                                : "bg-white/5 border-transparent text-on-surface-variant/60 hover:bg-white/10 hover:border-white/10"
                                                        )}
                                                    >
                                                        <div className="flex flex-col items-start">
                                                            <span className="text-xs font-black uppercase">{f.extension}</span>
                                                            <span className="text-[9px] font-bold opacity-60 line-clamp-1">{f.label}</span>
                                                        </div>
                                                        {f.filesize && (
                                                            <span className="text-[10px] font-mono opacity-60">{(f.filesize / (1024 * 1024)).toFixed(1)}MB</span>
                                                        )}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="text-[10px] text-on-surface-variant/40 italic py-4">No formats found</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        <div className="space-y-4" >
                                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 ml-1">
                                                <Type size={12} /> Custom Filename
                                            </label>
                                            <div className="relative group">
                                                <input
                                                    type="text"
                                                    value={customFilename}
                                                    onChange={(e) => setCustomFilename(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/5 focus:border-primary/50 rounded-2xl px-5 py-4 text-sm font-bold outline-none transition-all placeholder:text-white/10"
                                                    placeholder="Enter filename..."
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 ml-1">
                                                <ImageIcon size={12} /> Metadata Options
                                            </label>
                                            <button
                                                onClick={() => setEmbedThumbnail(!embedThumbnail)}
                                                className={clsx(
                                                    "w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                                                    embedThumbnail ? "bg-primary/10 border-primary/30 text-primary" : "bg-white/5 border-white/5 text-on-surface-variant/40"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-black uppercase">Embed Thumbnail</span>
                                                </div>
                                                <div className={clsx(
                                                    "w-5 h-5 rounded-md flex items-center justify-center border-2 transition-colors",
                                                    embedThumbnail ? "bg-primary border-primary text-on-primary" : "border-white/10"
                                                )}>
                                                    {embedThumbnail && <CheckCircle size={14} />}
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 pt-6">
                                    <button
                                        onClick={() => setShowConfirmDialog(false)}
                                        className="flex-1 py-5 rounded-[2rem] bg-white/5 text-on-background font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all active:scale-95"
                                    >
                                        Later
                                    </button>
                                    <button
                                        onClick={confirmDownload}
                                        className="flex-[2] py-5 rounded-[2rem] bg-primary text-on-primary font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-primary/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 border border-white/10"
                                    >
                                        <Download size={18} />
                                        Commit Download
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <YtDlpFooter />
        </div>
    );
};

export default Downloads;
