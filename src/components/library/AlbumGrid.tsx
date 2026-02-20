import React from 'react';
import { Disc, Play, Heart } from 'lucide-react';
import { Track } from '../../types/library';
import { useNavigate } from 'react-router-dom';
import { useFavoritesStore } from '../../store/favoritesStore';
import clsx from 'clsx';
import { useEffect, useState } from 'react';

interface AlbumGridProps {
    tracks: Track[];
}

const AlbumGrid: React.FC<AlbumGridProps> = ({ tracks }) => {
    const navigate = useNavigate();
    const { addFavorite, removeFavorite, isFavorite } = useFavoritesStore();
    const [albumCovers, setAlbumCovers] = useState<Record<string, string>>({});

    // Group tracks by album
    const albums = React.useMemo(() => {
        const map = new Map<string, { title: string; artist: string; count: number; art?: string }>();
        tracks.forEach(t => {
            const key = `${t.album}-${t.artist}`;
            if (!map.has(key)) {
                map.set(key, { title: t.album || 'Unknown Album', artist: t.artist || 'Unknown Artist', count: 0, art: t.image_path });
            }
            map.get(key)!.count++;
        });
        return Array.from(map.values());
    }, [tracks]);

    useEffect(() => {
        const fetchCovers = async () => {
            const covers: Record<string, string> = {};
            for (const album of albums) {
                if (album.art) {
                    covers[album.title] = album.art;
                    continue;
                }
                const data = await window.ipcRenderer.invoke('metadata:syncAlbum', { artist: album.artist, album: album.title });
                if (data?.cover) {
                    covers[album.title] = data.cover;
                }
            }
            setAlbumCovers(covers);
        };
        if (albums.length > 0) {
            fetchCovers();
        }
    }, [albums]);

    if (albums.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center text-on-surface-variant">
                <Disc size={48} className="mb-4 opacity-50" />
                <p>No albums found.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 p-4">
            {albums.map((album) => (
                <div
                    key={`${album.title}-${album.artist}`}
                    className="group cursor-pointer"
                    onClick={() => navigate(`/album/${encodeURIComponent(album.title)}`)}
                >
                    <div className="aspect-square bg-surface-variant rounded-xl mb-3 overflow-hidden relative shadow-soft group-hover:shadow-medium transition-all">
                        {/* Artwork */}
                        {(album.art || albumCovers[album.title]) ? (
                            <img
                                src={`atmusic://${album.art || albumCovers[album.title]}`}
                                alt={album.title}
                                className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary-500/20 to-secondary-500/20 flex items-center justify-center text-primary-500">
                                <Disc size={40} />
                            </div>
                        )}

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const id = `album-${album.title}-${album.artist}`;
                                    if (isFavorite(id)) removeFavorite(id);
                                    else addFavorite({ ...album, id, type: 'album', image_path: album.art });
                                }}
                                className={clsx(
                                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                                    isFavorite(`album-${album.title}-${album.artist}`) ? "bg-red-500 text-white" : "bg-white/20 text-white hover:bg-red-500"
                                )}
                            >
                                <Heart size={20} fill={isFavorite(`album-${album.title}-${album.artist}`) ? "currentColor" : "none"} />
                            </button>
                            <div className="w-12 h-12 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                                <Play size={24} fill="currentColor" className="ml-1" />
                            </div>
                        </div>
                    </div>
                    <h3 className="font-semibold text-on-background truncate">{album.title}</h3>
                    <p className="text-sm text-on-surface-variant truncate">{album.artist} • {album.count} songs</p>
                </div>
            ))}
        </div>
    );
};

export default AlbumGrid;
