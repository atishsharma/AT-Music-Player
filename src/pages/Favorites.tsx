import { useFavoritesStore } from '../store/favoritesStore';
import SongList from '../components/library/SongList';
import { Heart, Music, Disc, Mic2 } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { toAtmusicUrl } from '../utils/path';

type Tab = 'songs' | 'albums' | 'artists';

const Favorites = () => {
    const { favorites } = useFavoritesStore();
    const [activeTab, setActiveTab] = useState<Tab>('songs');
    const navigate = useNavigate();

    const favSongs = favorites.filter(f => f.type === 'song');
    const favAlbums = favorites.filter(f => f.type === 'album');
    const favArtists = favorites.filter(f => f.type === 'artist');

    const tabs = [
        { id: 'songs', label: 'Songs', icon: Music, count: favSongs.length },
        { id: 'albums', label: 'Albums', icon: Disc, count: favAlbums.length },
        { id: 'artists', label: 'Artists', icon: Mic2, count: favArtists.length },
    ];

    return (
        <div className="space-y-8 pb-24 pt-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-white/5 pb-8">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary shadow-2xl shadow-primary/20 border border-primary/30 outline outline-1 outline-primary/20">
                        <Heart size={32} fill="currentColor" className="animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-primary tracking-tighter italic outline-primary/20">
                            Your Favorites
                        </h1>
                        <p className="text-on-surface-variant font-medium text-xs tracking-[0.2em] opacity-60">Everything You Love, In One Place.</p>
                    </div>
                </div>

                {/* Tabs moved to right */}
                <div className="flex space-x-1 bg-surface-variant/30 p-1.5 rounded-[2rem] border border-white/5 shadow-inner">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as Tab)}
                                className={clsx(
                                    'flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300',
                                    isActive
                                        ? 'bg-primary text-on-primary shadow-xl shadow-primary/20 scale-105 active:scale-95'
                                        : 'text-on-surface-variant/60 hover:text-on-surface hover:bg-surface-variant/50'
                                )}
                            >
                                <Icon size={14} />
                                {tab.label}
                                <span className={clsx(
                                    "ml-1 px-2 py-0.5 rounded-full text-[8px]",
                                    isActive ? "bg-on-primary/20 text-on-primary" : "bg-surface-variant/20 text-on-surface-variant"
                                )}>
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {activeTab === 'songs' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {favSongs.length > 0 ? (
                            <SongList tracks={favSongs as any} onPlay={() => { }} />
                        ) : (
                            <EmptyState icon={Music} label="No favorite songs yet" />
                        )}
                    </div>
                )}

                {activeTab === 'albums' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {favAlbums.length > 0 ? (
                            favAlbums.map((album) => (
                                <div
                                    key={album.id}
                                    className="group cursor-pointer"
                                    onClick={() => navigate(`/album/${encodeURIComponent(album.title || '')}`)}
                                >
                                    <div className="aspect-square bg-surface-variant rounded-2xl mb-3 overflow-hidden relative shadow-soft group-hover:shadow-xl transition-all border border-white/5">
                                        {album.image_path ? (
                                            <img src={toAtmusicUrl(album.image_path)} alt={album.title} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-primary-500/20 to-secondary-500/20 flex items-center justify-center text-primary-500">
                                                <Disc size={48} />
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-on-background truncate">{album.title}</h3>
                                    <p className="text-xs text-on-surface-variant truncate uppercase tracking-widest">{album.artist}</p>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full">
                                <EmptyState icon={Disc} label="No favorite albums yet" />
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'artists' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {favArtists.length > 0 ? (
                            favArtists.map((artist) => (
                                <div
                                    key={artist.id}
                                    className="group cursor-pointer text-center"
                                    onClick={() => navigate(`/artist/${encodeURIComponent(artist.title || '')}`)}
                                >
                                    <div className="aspect-square bg-surface-variant rounded-full mb-3 overflow-hidden relative shadow-soft group-hover:shadow-xl transition-all mx-auto w-4/5 border-4 border-white/5">
                                        <div className="w-full h-full bg-gradient-to-br from-secondary-100 to-primary-100 flex items-center justify-center text-secondary-300">
                                            <span className="text-4xl font-bold opacity-50">{(artist.title || '?')[0]}</span>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-on-background truncate">{artist.title}</h3>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full">
                                <EmptyState icon={Mic2} label="No favorite artists yet" />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const EmptyState = ({ icon: Icon, label }: { icon: any, label: string }) => (
    <div className="flex flex-col items-center justify-center py-24 text-on-surface-variant space-y-4">
        <div className="w-20 h-20 rounded-full bg-surface-variant/30 flex items-center justify-center">
            <Icon size={40} className="opacity-20" />
        </div>
        <p className="font-bold tracking-tight">{label}</p>
    </div>
);

export default Favorites;
