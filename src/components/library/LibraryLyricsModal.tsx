import React, { useState, useEffect } from 'react';
import { X, Edit3, RefreshCw, AudioLines, Music, Quote } from 'lucide-react';
import { Track } from '../../types/library';

interface LibraryLyricsModalProps {
    track: Track;
    onClose: () => void;
    onSearchRequest: () => void;
}

const LibraryLyricsModal: React.FC<LibraryLyricsModalProps> = ({ track, onClose, onSearchRequest }) => {
    const [loading, setLoading] = useState(false);
    const [lyrics, setLyrics] = useState<{ plainLyrics: string, syncedLyrics: any[], isSynced: boolean } | null>(null);

    useEffect(() => {
        fetchLyricsFromDB();
    }, [track]);

    const fetchLyricsFromDB = async () => {
        setLoading(true);
        try {
            const result = await window.ipcRenderer.invoke('lyrics:get', {
                artist: track.artist,
                title: track.title,
                album: track.album,
                duration: track.duration
            });
            setLyrics(result);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
            <div className="bg-surface border-2 border-white/5 rounded-[3rem] w-full max-w-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-500 h-[85vh] relative">
                {/* Background Accent */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />

                <div className="flex items-center justify-between p-8 border-b border-white/5 bg-white/2">
                    <div className="flex items-center gap-5">
                        <div className="relative w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                            <AudioLines size={28} />
                            {lyrics?.isSynced && (
                                <span className="absolute -bottom-2 -right-1 text-[7px] uppercase tracking-[0.2em] font-black text-on-primary bg-primary px-2 py-1 rounded-md shadow-lg shadow-primary/20 border border-surface">
                                    Synced
                                </span>
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-2xl font-black text-on-surface tracking-tighter leading-tight truncate max-w-[350px]">{track.title}</h2>
                            </div>
                            <p className="text-sm font-bold text-primary/60 uppercase tracking-widest">{track.artist}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onSearchRequest}
                            className="p-3 bg-surface-variant/40 hover:bg-primary/20 text-on-surface-variant hover:text-primary rounded-full transition-all border border-white/5"
                            title="Search Lyrics Online"
                        >
                            <Edit3 size={18} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-3 hover:bg-white/10 rounded-full text-on-surface-variant transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar p-10 relative">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
                            <RefreshCw className="animate-spin text-primary" size={48} />
                            <p className="text-xs font-black uppercase tracking-[0.3em] text-primary animate-pulse">Scanning Database...</p>
                        </div>
                    ) : lyrics?.plainLyrics ? (
                        <div className="max-w-xl mx-auto space-y-12">
                            <div className="flex items-center gap-4 opacity-20">
                                <Quote size={40} className="text-primary" />
                                <div className="h-[2px] flex-1 bg-gradient-to-r from-primary/50 to-transparent" />
                            </div>

                            <div className="space-y-8">
                                <div className="whitespace-pre-wrap font-bold text-2xl leading-[1.6] text-on-surface/90 hover:text-on-surface transition-colors selection:bg-primary selection:text-on-primary">
                                    {lyrics.plainLyrics}
                                </div>
                            </div>

                            <div className="h-20" /> {/* Bottom Spacer */}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center gap-8 text-on-surface-variant py-20">
                            <div className="w-24 h-24 rounded-[2rem] bg-surface-variant/20 flex items-center justify-center text-on-surface-variant/10">
                                <Music size={60} />
                            </div>
                            <div className="text-center space-y-2">
                                <p className="text-xl font-black tracking-tight text-on-surface">No lyrics found</p>
                                <p className="text-sm font-medium opacity-60">This song doesn't have local lyrics yet.</p>
                            </div>
                            <button
                                onClick={onSearchRequest}
                                className="group flex items-center gap-3 bg-primary text-on-primary px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95 shadow-xl shadow-primary/20"
                            >
                                <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                                Search LRCLIB
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LibraryLyricsModal;
