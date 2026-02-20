import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlaylistStore } from '../store/playlistStore';
import { ArrowLeft, Play, ImagePlus } from 'lucide-react';
import SongList from '../components/library/SongList';
import { usePlayerStore } from '../store/playerStore';

const PlaylistDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentPlaylist, fetchPlaylist, removeTrackFromPlaylist, deletePlaylist } = usePlaylistStore();
    const { play, setQueue } = usePlayerStore();

    useEffect(() => {
        if (id) {
            fetchPlaylist(id);
        }
    }, [id]);

    const handlePlayPlaylist = () => {
        if (currentPlaylist?.tracks && currentPlaylist.tracks.length > 0) {
            setQueue(currentPlaylist.tracks);
            play(currentPlaylist.tracks[0]);
        }
    };

    const handleAddPhoto = async () => {
        if (!id) return;
        const imagePath = await window.ipcRenderer.invoke('dialog:openImage');
        if (imagePath) {
            await window.ipcRenderer.invoke('playlist:updateImage', { playlistId: id, imagePath });
            fetchPlaylist(id); // reload
        }
    };

    if (!currentPlaylist) return <div className="p-8">Loading...</div>;

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-8 bg-gradient-to-b from-primary/20 to-transparent flex items-end gap-8">
                <div className="w-52 h-52 bg-surface border border-primary/20 rounded-2xl shadow-xl flex items-center justify-center relative group overflow-hidden flex-shrink-0">
                    {currentPlaylist.image_path ? (
                        <img src={`atmusic://${currentPlaylist.image_path}`} alt={currentPlaylist.name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-6xl font-bold text-primary opacity-50">{currentPlaylist.name[0]}</span>
                    )}
                    <button onClick={handleAddPhoto} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer text-white">
                        <ImagePlus size={32} />
                    </button>
                </div>
                <div className="flex-1">
                    <button
                        onClick={() => navigate('/playlists')}
                        className="flex items-center gap-2 text-on-surface-variant hover:text-on-background transition-colors mb-4"
                    >
                        <ArrowLeft size={20} /> Back to Playlists
                    </button>
                    <h5 className="uppercase tracking-widest text-sm font-bold text-on-surface-variant">Playlist</h5>
                    <h1 className="text-6xl font-black text-on-background tracking-tight">{currentPlaylist.name}</h1>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handlePlayPlaylist}
                            className="w-14 h-14 bg-primary hover:bg-primary/90 rounded-full flex items-center justify-center text-on-primary shadow-lg shadow-primary/30 transition-all hover:scale-105"
                        >
                            <Play size={28} fill="currentColor" className="ml-1" />
                        </button>
                        <button
                            onClick={() => {
                                deletePlaylist(currentPlaylist.id);
                                navigate('/playlists');
                            }}
                            className="text-on-surface-variant hover:text-red-500 px-4 py-2 border border-primary/20 rounded-full transition-colors font-medium text-sm hover:bg-red-500/10 hover:border-red-500/50"
                        >
                            Delete Playlist
                        </button>
                    </div>
                </div>
            </div>

            {/* Tracks */}
            <div className="flex-1 overflow-auto p-6">
                {currentPlaylist.tracks && currentPlaylist.tracks.length > 0 ? (
                    <SongList
                        tracks={currentPlaylist.tracks}
                        onPlay={(track) => {
                            setQueue(currentPlaylist.tracks || []);
                            play(track);
                        }}
                        onRemove={async (track) => {
                            if (id && track.id) {
                                await removeTrackFromPlaylist(id, track.id);
                            }
                        }}
                    />
                ) : (
                    <div className="text-center py-20 text-on-surface-variant">
                        <p>This playlist is empty.</p>
                        <p>Go to your library to add songs!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlaylistDetail;
