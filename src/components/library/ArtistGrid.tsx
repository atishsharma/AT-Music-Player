import React from 'react';
import { Mic2, Play, Heart } from 'lucide-react';
import { Track } from '../../types/library';
import { useNavigate } from 'react-router-dom';
import { useFavoritesStore } from '../../store/favoritesStore';
import clsx from 'clsx';
import { useEffect, useState } from 'react';

interface ArtistGridProps {
    tracks: Track[];
}

const ArtistGrid: React.FC<ArtistGridProps> = ({ tracks }) => {
    const navigate = useNavigate();
    const { addFavorite, removeFavorite, isFavorite } = useFavoritesStore();
    const [artistImages, setArtistImages] = useState<Record<string, string>>({});

    // Group tracks by artist
    const artists = React.useMemo(() => {
        const map = new Map<string, { name: string; count: number }>();
        tracks.forEach(t => {
            const key = t.artist || 'Unknown Artist';
            if (!map.has(key)) {
                map.set(key, { name: key, count: 0 });
            }
            map.get(key)!.count++;
        });
        return Array.from(map.values());
    }, [tracks]);

    useEffect(() => {
        const fetchImages = async () => {
            const images: Record<string, string> = {};
            for (const artist of artists) {
                const data = await window.ipcRenderer.invoke('library:getArtist', artist.name);
                if (data?.image_path) {
                    images[artist.name] = data.image_path;
                }
            }
            setArtistImages(images);
        };
        if (artists.length > 0) {
            fetchImages();
        }
    }, [artists]);

    if (artists.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center text-on-surface-variant">
                <Mic2 size={48} className="mb-4 opacity-50" />
                <p>No artists found.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 p-4">
            {artists.map((artist) => (
                <div
                    key={artist.name}
                    className="group cursor-pointer text-center"
                    onClick={() => navigate(`/artist/${encodeURIComponent(artist.name)}`)}
                >
                    <div className="aspect-square bg-surface-variant rounded-full mb-3 overflow-hidden relative shadow-soft group-hover:shadow-medium transition-all mx-auto w-4/5">
                        {/* Artwork */}
                        {artistImages[artist.name] ? (
                            <img
                                src={`atmusic://${encodeURI(artistImages[artist.name])}`}
                                alt={artist.name}
                                className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-secondary-100 to-primary-100 flex items-center justify-center text-secondary-300">
                                {/* Initials */}
                                <span className="text-4xl font-bold opacity-50">{artist.name[0]}</span>
                            </div>
                        )}

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 rounded-full">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const id = `artist-${artist.name}`;
                                    if (isFavorite(id)) removeFavorite(id);
                                    else addFavorite({ id, title: artist.name, type: 'artist' });
                                }}
                                className={clsx(
                                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                                    isFavorite(`artist-${artist.name}`) ? "bg-red-500 text-white" : "bg-white/20 text-white hover:bg-red-500"
                                )}
                            >
                                <Heart size={20} fill={isFavorite(`artist-${artist.name}`) ? "currentColor" : "none"} />
                            </button>
                            <div className="w-12 h-12 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                                <Play size={24} fill="currentColor" className="ml-1" />
                            </div>
                        </div>
                    </div>
                    <h3 className="font-semibold text-on-background truncate">{artist.name}</h3>
                    <p className="text-sm text-on-surface-variant truncate">{artist.count} songs</p>
                </div>
            ))}
        </div>
    );
};

export default ArtistGrid;
