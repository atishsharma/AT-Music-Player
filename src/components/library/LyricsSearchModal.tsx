import React, { useState } from 'react';
import { X, Search, RefreshCw, AudioLines } from 'lucide-react';
import { Track } from '../../types/library';
import { useLibraryStore } from '../../store/libraryStore';

interface LyricsSearchModalProps {
    track: Track;
    onClose: () => void;
    onFetched?: () => void;
}

const LyricsSearchModal: React.FC<LyricsSearchModalProps> = ({ track, onClose, onFetched }) => {
    const [loading, setLoading] = useState(false);
    const [editTitle, setEditTitle] = useState(track.title || '');
    const [editArtist, setEditArtist] = useState(track.artist || '');
    const [editAlbum, setEditAlbum] = useState(track.album || '');

    const fetchLyricsFromLRCLIB = async () => {
        setLoading(true);
        try {
            const result = await window.ipcRenderer.invoke('lyrics:fetchLRCLIB', {
                searchArtist: editArtist,
                searchTitle: editTitle,
                searchAlbum: editAlbum,
                saveArtist: track.artist, // Still save to original track identifiers
                saveTitle: track.title,
                duration: track.duration
            });
            if (result) {
                useLibraryStore.getState().refreshLibrary();
                if (onFetched) onFetched();
                onClose();
            } else {
                alert('Lyrics not found.');
            }
        } catch (e) {
            console.error(e);
            alert('Failed to fetch lyrics.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
            <div className="bg-surface border-2 border-primary/20 rounded-[2.5rem] w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-primary/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <Search size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-primary tracking-tighter uppercase italic">Lyrics Finder</h2>
                            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Search & Sync</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-primary/10 rounded-full text-on-surface-variant transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                        <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                            <AudioLines size={24} className="text-primary/40" />
                        </div>
                        <div className="truncate">
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Target Track</p>
                            <h3 className="text-sm font-bold text-on-surface truncate leading-tight">{track.title}</h3>
                            <p className="text-xs font-medium text-on-surface-variant truncate">{track.artist}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="group">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-primary mb-2 ml-1 group-focus-within:translate-x-1 transition-transform">Search Title</label>
                            <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                placeholder="Song Title"
                                className="w-full bg-surface-variant/20 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-primary/40 focus:bg-surface-variant/40 transition-all outline-none"
                            />
                        </div>
                        <div className="group">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-primary mb-2 ml-1 group-focus-within:translate-x-1 transition-transform">Search Artist</label>
                            <input
                                type="text"
                                value={editArtist}
                                onChange={(e) => setEditArtist(e.target.value)}
                                placeholder="Artist Name"
                                className="w-full bg-surface-variant/20 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-primary/40 focus:bg-surface-variant/40 transition-all outline-none"
                            />
                        </div>
                        <div className="group">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-primary mb-2 ml-1 group-focus-within:translate-x-1 transition-transform">Search Album (Optional)</label>
                            <input
                                type="text"
                                value={editAlbum}
                                onChange={(e) => setEditAlbum(e.target.value)}
                                placeholder="Album Name"
                                className="w-full bg-surface-variant/20 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-primary/40 focus:bg-surface-variant/40 transition-all outline-none"
                            />
                        </div>
                    </div>

                    <button
                        onClick={fetchLyricsFromLRCLIB}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 bg-primary text-on-primary font-black uppercase tracking-widest text-xs py-5 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2 group"
                    >
                        {loading ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} className="group-hover:rotate-12 transition-transform" />}
                        {loading ? 'Searching...' : 'Search & Save Lyrics'}
                    </button>

                    <p className="text-[9px] text-center text-on-surface-variant font-medium uppercase tracking-widest opacity-40">Powered by LRCLIB API</p>
                </div>
            </div>
        </div>
    );
};

export default LyricsSearchModal;
