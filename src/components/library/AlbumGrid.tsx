import React from 'react';
import { Disc, Play, Heart } from 'lucide-react';
import { Track } from '../../types/library';
import { useNavigate } from 'react-router-dom';
import { useFavoritesStore } from '../../store/favoritesStore';
import clsx from 'clsx';
import { useEffect, useState, useMemo } from 'react';
import { toAtmusicUrl } from '../../utils/path';
import { useSettingsStore } from '../../store/settingsStore';
import { ArrowDownAZ, ArrowUpZA, ArrowDown10, ArrowUp01, SlidersHorizontal } from 'lucide-react';

interface AlbumGridProps {
    tracks: Track[];
}

const AlbumGrid: React.FC<AlbumGridProps> = ({ tracks }) => {
    const navigate = useNavigate();
    const { addFavorite, removeFavorite, isFavorite } = useFavoritesStore();
    const { albumSortBy, albumSortOrder, albumThumbnailSize, setAlbumSortBy, setAlbumSortOrder, setAlbumThumbnailSize } = useSettingsStore();
    const [albumCovers, setAlbumCovers] = useState<Record<string, { cover?: string; year?: number }>>({});

    // Group tracks by album
    const albumsArr = React.useMemo(() => {
        const map = new Map<string, { title: string; artist: string; count: number; art?: string; year?: number }>();
        tracks.forEach(t => {
            const key = `${t.album}-${t.artist}`;
            if (!map.has(key)) {
                map.set(key, { title: t.album || 'Unknown Album', artist: t.artist || 'Unknown Artist', count: 0, art: t.image_path, year: (t as any).year });
            }
            map.get(key)!.count++;
        });
        return Array.from(map.values());
    }, [tracks]);

    useEffect(() => {
        const fetchCovers = async () => {
            const covers: Record<string, { cover?: string; year?: number }> = {};
            for (const album of albumsArr) {
                if (album.art && album.year) {
                    covers[album.title] = { cover: album.art, year: album.year };
                    continue;
                }
                const data = await window.ipcRenderer.invoke('metadata:syncAlbum', { artist: album.artist, album: album.title });
                if (data) {
                    covers[album.title] = { cover: data.cover || album.art, year: data.year || album.year };
                }
            }
            setAlbumCovers(covers);
        };
        if (albumsArr.length > 0) {
            fetchCovers();
        }
    }, [albumsArr]);

    const sortedAlbums = useMemo(() => {
        const sorted = [...albumsArr].sort((a, b) => {
            let res = 0;
            switch (albumSortBy) {
                case 'name':
                    res = a.title.localeCompare(b.title);
                    break;
                case 'artist':
                    res = a.artist.localeCompare(b.artist);
                    break;
                case 'count':
                    res = b.count - a.count;
                    break;
            }
            return albumSortOrder === 'asc' ? res : -res;
        });
        return sorted;
    }, [albumsArr, albumSortBy, albumSortOrder, albumCovers]);

    if (albumsArr.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center text-on-surface-variant">
                <Disc size={48} className="mb-4 opacity-50" />
                <p>No albums found.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-surface-variant/20 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                    <div className="flex bg-surface-variant/40 rounded-lg p-1">
                        {['name', 'artist', 'count'].map(option => (
                            <button
                                key={option}
                                onClick={() => setAlbumSortBy(option as any)}
                                className={clsx(
                                    "px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest transition-all",
                                    albumSortBy === option ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                                )}
                            >
                                {option === 'count' ? 'Songs' : option}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setAlbumSortOrder(albumSortOrder === 'asc' ? 'desc' : 'asc')}
                        className="p-2 rounded-lg bg-surface-variant/40 text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 text-xs font-bold uppercase tracking-widest"
                        title="Toggle Sort Order"
                    >
                        {albumSortBy === 'name' || albumSortBy === 'artist' ? (
                            albumSortOrder === 'asc' ? <ArrowDownAZ size={16} /> : <ArrowUpZA size={16} />
                        ) : (
                            albumSortOrder === 'asc' ? <ArrowDown10 size={16} /> : <ArrowUp01 size={16} />
                        )}
                        <span className="hidden sm:inline">Order</span>
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <SlidersHorizontal size={14} className="text-on-surface-variant" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-70">Grid Size</span>
                    <input
                        type="range"
                        min="100"
                        max="250"
                        step="10"
                        value={albumThumbnailSize}
                        onChange={(e) => setAlbumThumbnailSize(Number(e.target.value))}
                        className="w-24 h-1.5 bg-surface-variant rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full"
                    />
                </div>
            </div>

            <div
                className="grid gap-6 p-4"
                style={{
                    gridTemplateColumns: `repeat(auto-fill, minmax(${albumThumbnailSize}px, 1fr))`
                }}
            >
                {sortedAlbums.map((album) => (
                    <div
                        key={`${album.title}-${album.artist}`}
                        className="group cursor-pointer flex flex-col items-center text-center"
                        onClick={() => navigate(`/album/${encodeURIComponent(album.title)}`)}
                    >
                        <div
                            className="bg-surface-variant rounded-xl mb-3 overflow-hidden relative shadow-soft group-hover:shadow-medium transition-all w-full"
                            style={{ aspectRatio: '1 / 1' }}
                        >
                            {/* Artwork */}
                            {(album.art || albumCovers[album.title]?.cover) ? (
                                <img
                                    src={toAtmusicUrl(album.art || albumCovers[album.title]?.cover)}
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
                                        "w-10 h-10 rounded-full flex items-center justify-center transition-all scale-75 group-hover:scale-100 delay-75",
                                        isFavorite(`album-${album.title}-${album.artist}`) ? "bg-red-500 text-white" : "bg-white/20 text-white hover:bg-red-500"
                                    )}
                                >
                                    <Heart size={20} fill={isFavorite(`album-${album.title}-${album.artist}`) ? "currentColor" : "none"} />
                                </button>
                                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-110 transition-transform hover:bg-primary-600">
                                    <Play size={24} fill="currentColor" className="ml-1" />
                                </div>
                            </div>
                        </div>
                        <h3 className="font-semibold text-on-background truncate w-full text-sm leading-tight mb-1 px-2">{album.title}</h3>
                        <p className="text-xs text-on-surface-variant truncate w-full px-2 opacity-80">{album.artist}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">
                            <span>{album.count} songs</span>
                            {albumCovers[album.title]?.year && (
                                <>
                                    <span>•</span>
                                    <span>{albumCovers[album.title]?.year}</span>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AlbumGrid;
