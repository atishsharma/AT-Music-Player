import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Save, X, RefreshCw, Edit2 } from 'lucide-react';
import { Track } from '../../types/library';
import { useLibraryStore } from '../../store/libraryStore';

interface MetadataEditorProps {
    track: Track;
    onClose: () => void;
}

const MetadataEditor: React.FC<MetadataEditorProps> = ({ track, onClose }) => {
    const [title, setTitle] = useState(track.title || '');
    const [artist, setArtist] = useState(track.artist || '');
    const [album, setAlbum] = useState(track.album || '');
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async () => {
        setIsSearching(true);
        try {
            const res = await window.ipcRenderer.invoke('metadata:searchArtist', artist || title);
            if (!res || res.length === 0) {
                (window as any).showToast?.('No results found.');
            }
        } catch (e) {
            console.error('Metadata search failed:', e);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSave = async () => {
        try {
            await window.ipcRenderer.invoke('library:updateTrackMetadata', {
                id: Number(track.id),
                title,
                artist,
                album
            });
            await useLibraryStore.getState().refreshLibrary();
            onClose();
            (window as any).showToast?.(`${title} - metadata updated!`);
        } catch (e) {
            console.error('Failed to update metadata:', e);
            (window as any).showToast?.(`Error updating metadata.`);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-primary p-7 rounded-[2.5rem] w-full max-w-md shadow-2xl relative text-on-primary border border-white/10"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={onClose}
                        className="absolute right-6 top-6 p-2 text-on-primary/70 hover:text-on-primary hover:bg-black/10 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <h2 className="text-2xl font-black mb-8 flex items-center gap-3 tracking-tighter">
                        <Edit2 size={24} className="text-on-primary" />
                        Edit Metadata
                    </h2>

                    <div className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-on-primary/60 uppercase tracking-[0.2em] ml-1">Song Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-black/10 border border-white/5 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-on-primary/30 transition-all font-bold text-on-primary placeholder-on-primary/30"
                                placeholder="e.g. Blinding Lights"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-on-primary/60 uppercase tracking-[0.2em] ml-1">
                                Artist(s) <span className="opacity-40 italic text-[9px] lowercase font-medium tracking-normal">(use comma for multiple)</span>
                            </label>
                            <input
                                type="text"
                                value={artist}
                                onChange={(e) => setArtist(e.target.value)}
                                className="w-full bg-black/10 border border-white/5 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-on-primary/30 transition-all font-bold text-on-primary placeholder-on-primary/30"
                                placeholder="e.g. Artist One, Artist Two"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-on-primary/60 uppercase tracking-[0.2em] ml-1">Album / Movie</label>
                            <input
                                type="text"
                                value={album}
                                onChange={(e) => setAlbum(e.target.value)}
                                className="w-full bg-black/10 border border-white/5 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-on-primary/30 transition-all font-bold text-on-primary placeholder-on-primary/30"
                                placeholder="e.g. After Hours"
                            />
                        </div>

                        <div className="pt-4 flex flex-col gap-3">
                            <button
                                onClick={handleSearch}
                                disabled={isSearching}
                                className="w-full py-3.5 bg-black/20 hover:bg-black/30 text-on-primary rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                            >
                                {isSearching ? <RefreshCw size={18} className="animate-spin" /> : <Search size={18} />}
                                Auto Fetch Metadata
                            </button>

                            <button
                                onClick={handleSave}
                                className="w-full py-4 bg-white text-primary hover:bg-white/90 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-2 mt-2"
                            >
                                <Save size={18} />
                                Save Changes
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default MetadataEditor;
