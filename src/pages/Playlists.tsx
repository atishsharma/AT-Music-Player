import { useEffect, useState } from 'react';
import { usePlaylistStore } from '../store/playlistStore';
import { Plus, Music, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toAtmusicUrl } from '../utils/path';

const PlaylistsPage = () => {
    const { playlists, fetchPlaylists, createPlaylist, deletePlaylist } = usePlaylistStore();
    const navigate = useNavigate();
    const [isCreating, setIsCreating] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');

    useEffect(() => {
        fetchPlaylists();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPlaylistName.trim()) {
            await createPlaylist(newPlaylistName);
            setNewPlaylistName('');
            setIsCreating(false);
        }
    };

    return (
        <div className="p-8 space-y-8 pt-10">
            <div className="flex items-center justify-between border-b border-white/5 pb-8">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary shadow-2xl shadow-primary/20 border border-primary/30 outline outline-1 outline-primary/20">
                        <Music size={32} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-primary tracking-tighter italic">
                            Playlists
                        </h1>
                        <p className="text-on-surface-variant font-medium text-xs tracking-[0.2em] opacity-60">Your Personal Collections</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-3 px-6 py-3 bg-primary hover:bg-primary/90 rounded-2xl text-on-primary font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-primary/20 active:scale-95"
                >
                    <Plus size={18} />
                    <span>New Playlist</span>
                </button>
            </div>

            {isCreating && (
                <form onSubmit={handleCreate} className="bg-surface-variant/50 p-6 rounded-2xl border border-white/5 animate-in fade-in slide-in-from-top-4">
                    <h3 className="text-lg font-medium mb-4">Create New Playlist</h3>
                    <div className="flex gap-4">
                        <input
                            type="text"
                            value={newPlaylistName}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                            placeholder="Playlist Name"
                            className="flex-1 bg-surface-variant border border-primary/20 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-on-surface-variant/50 text-on-background"
                            autoFocus
                        />
                        <button
                            type="submit"
                            className="px-6 py-2 bg-primary hover:bg-primary/90 rounded-xl text-on-primary font-bold transition-colors shadow-md shadow-primary/20"
                        >
                            Create
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsCreating(false)}
                            className="px-6 py-2 hover:bg-surface-variant rounded-xl font-medium transition-colors border border-transparent hover:border-white/10"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {playlists.map((playlist) => (
                    <div
                        key={playlist.id}
                        onClick={() => navigate(`/playlists/${playlist.id}`)}
                        className="group relative bg-surface-variant/30 hover:bg-surface-variant/50 border border-white/5 rounded-2xl p-4 transition-all hover:scale-[1.02] cursor-pointer"
                    >
                        <div className="aspect-square bg-surface border border-primary/20 rounded-xl mb-4 flex items-center justify-center text-primary overflow-hidden shadow-inner relative">
                            {playlist.image_path ? (
                                <img src={toAtmusicUrl(playlist.image_path)} alt={playlist.name} className="w-full h-full object-cover" />
                            ) : (
                                <Music size={48} className="opacity-60" />
                            )}
                        </div>
                        <h3 className="text-xl font-bold truncate text-on-background">{playlist.name}</h3>
                        <p className="text-on-surface-variant text-sm">{playlist.description || 'No description'}</p>

                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deletePlaylist(playlist.id);
                                }}
                                className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-full transition-colors backdrop-blur-sm"
                                title="Delete Playlist"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}

                {playlists.length === 0 && !isCreating && (
                    <div className="col-span-full py-20 text-center text-on-surface-variant">
                        <Music size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="text-xl">No playlists yet.</p>
                        <p className="text-sm mt-2">Create one to get started!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlaylistsPage;
