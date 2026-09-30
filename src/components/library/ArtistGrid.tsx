import React from 'react';
import { Mic2, Play, Heart } from 'lucide-react';
import { Track } from '../../types/library';
import { useNavigate } from 'react-router-dom';
import { useFavoritesStore } from '../../store/favoritesStore';
import clsx from 'clsx';
import { useEffect, useState, useMemo } from 'react';
import { toAtmusicUrl } from '../../utils/path';
import { useSettingsStore } from '../../store/settingsStore';
import { ArrowDownAZ, ArrowUpZA, ArrowDown10, ArrowUp01 } from 'lucide-react';
import Pager from './Pager';

const ARTISTS_PER_PAGE = 15;

interface ArtistGridProps {
    tracks: Track[];
}

const ArtistGrid: React.FC<ArtistGridProps> = ({ tracks }) => {
    const navigate = useNavigate();
    const { addFavorite, removeFavorite, isFavorite } = useFavoritesStore();
    const { artistSortBy, artistSortOrder, setArtistSortBy, setArtistSortOrder } = useSettingsStore();
    const [artistImages, setArtistImages] = useState<Record<string, string>>({});
    const [page, setPage] = useState(1);

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

    const sortedArtists = useMemo(() => {
        const sorted = [...artists].sort((a, b) => {
            let res = 0;
            switch (artistSortBy) {
                case 'name':
                    res = a.name.localeCompare(b.name);
                    break;
                case 'count':
                    res = b.count - a.count;
                    break;
            }
            return artistSortOrder === 'asc' ? res : -res;
        });
        return sorted;
    }, [artists, artistSortBy, artistSortOrder]);

    // Pagination: back to page 1 when the sort changes; stay in range when the library shrinks
    const totalPages = Math.max(1, Math.ceil(sortedArtists.length / ARTISTS_PER_PAGE));
    useEffect(() => { setPage(1); }, [artistSortBy, artistSortOrder]);
    useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
    const pagedArtists = useMemo(
        () => sortedArtists.slice((page - 1) * ARTISTS_PER_PAGE, page * ARTISTS_PER_PAGE),
        [sortedArtists, page]
    );

    // Photos for the visible page only (was one lookup per artist in the whole library)
    useEffect(() => {
        let cancelled = false;
        const fetchImages = async () => {
            for (const artist of pagedArtists) {
                if (cancelled) return;
                const data = await window.ipcRenderer.invoke('library:getArtist', artist.name);
                if (data?.image_path && !cancelled) {
                    setArtistImages(prev => prev[artist.name] === data.image_path ? prev : { ...prev, [artist.name]: data.image_path });
                }
            }
        };
        if (pagedArtists.length > 0) fetchImages();
        return () => { cancelled = true; };
    }, [pagedArtists]);

    if (artists.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center text-on-surface-variant">
                <Mic2 size={48} className="mb-4 opacity-50" />
                <p>No artists found.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-surface-variant/20 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                    <div className="flex bg-surface-variant/40 rounded-lg p-1">
                        {(['name', 'count'] as const).map(option => (
                            <button
                                key={option}
                                onClick={() => setArtistSortBy(option)}
                                className={clsx(
                                    "px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest transition-all",
                                    artistSortBy === option ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                                )}
                            >
                                {option === 'count' ? 'Songs' : option}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setArtistSortOrder(artistSortOrder === 'asc' ? 'desc' : 'asc')}
                        className="p-2 rounded-lg bg-surface-variant/40 text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 text-xs font-bold uppercase tracking-widest"
                        title="Toggle Sort Order"
                    >
                        {artistSortBy === 'name' ? (
                            artistSortOrder === 'asc' ? <ArrowDownAZ size={16} /> : <ArrowUpZA size={16} />
                        ) : (
                            artistSortOrder === 'asc' ? <ArrowDown10 size={16} /> : <ArrowUp01 size={16} />
                        )}
                        <span className="hidden sm:inline">Order</span>
                    </button>
                </div>

                <Pager page={page} totalPages={totalPages} onChange={setPage} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 p-4">
                {pagedArtists.map((artist) => (
                    <div
                        key={artist.name}
                        className="group cursor-pointer text-center"
                        onClick={() => navigate(`/artist/${encodeURIComponent(artist.name)}`)}
                    >
                        <div className="aspect-square bg-surface-variant rounded-full mb-3 overflow-hidden relative shadow-soft group-hover:shadow-medium transition-all mx-auto w-4/5">
                            {/* Artwork */}
                            {artistImages[artist.name] ? (
                                <img
                                    src={toAtmusicUrl(artistImages[artist.name])}
                                    alt={artist.name}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center text-primary/40">
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
                                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                                    <Play size={24} fill="currentColor" className="ml-1" />
                                </div>
                            </div>
                        </div>
                        <h3 className="font-semibold text-on-background truncate px-2">{artist.name}</h3>
                        <p className="text-sm text-on-surface-variant truncate px-2">{artist.count} songs</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ArtistGrid;
