import { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, Music, User, ExternalLink, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import axios from 'axios';

interface Artist {
    name: string;
    playcount: string;
    listeners: string;
    mbid: string;
    url: string;
    image: { '#text': string; size: string }[];
}

interface Track {
    name: string;
    artist: { name: string; mbid: string; url: string };
    playcount: string;
    listeners: string;
    url: string;
    image: { '#text': string; size: string }[];
}

const LastFMPage = () => {
    const { lastfmKey } = useSettingsStore();
    const [query, setQuery] = useState('');
    const [topArtists, setTopArtists] = useState<Artist[]>([]);
    const [topTracks, setTopTracks] = useState<Track[]>([]);
    const [searchResults, setSearchResults] = useState<Artist[]>([]);

    const [activeTab, setActiveTab] = useState<'trending' | 'search'>('trending');

    const fetchTopCharts = async () => {
        if (!lastfmKey) return;

        try {
            const [artRes, trackRes] = await Promise.all([
                axios.get(`https://ws.audioscrobbler.com/2.0/?method=chart.gettopartists&api_key=${lastfmKey}&format=json&limit=10`),
                axios.get(`https://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&api_key=${lastfmKey}&format=json&limit=10`)
            ]);
            setTopArtists(artRes.data.artists.artist);
            setTopTracks(trackRes.data.tracks.track);
        } catch (err) {
            console.error(err);
        } finally {

        }
    };

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!query.trim() || !lastfmKey) return;

        setActiveTab('search');
        try {
            const res = await axios.get(`https://ws.audioscrobbler.com/2.0/?method=artist.search&artist=${query}&api_key=${lastfmKey}&format=json&limit=20`);
            setSearchResults(res.data.results.artistmatches.artist);
        } catch (err) {
            console.error(err);
        } finally {

        }
    };

    useEffect(() => {
        if (lastfmKey) {
            fetchTopCharts();
        }
    }, [lastfmKey]);

    if (!lastfmKey) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center space-y-6 text-center">
                <div className="p-8 bg-red-500/10 rounded-[3rem] border border-red-500/20">
                    <Sparkles size={64} className="text-red-500 opacity-50 mb-4 mx-auto" />
                    <h2 className="text-3xl font-black text-on-background tracking-tighter">API Key Required</h2>
                    <p className="max-w-md text-on-surface-variant mt-2 font-medium">
                        Please enter your Last.fm API Key in the Settings page to unlock music discovery features.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12 pb-32 max-w-7xl mx-auto"
        >
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-8 px-4">
                <div className="flex items-center gap-6">
                    <div className="p-5 bg-primary/20 rounded-[2rem] border border-primary/20 shadow-lg shadow-primary/10">
                        <TrendingUp className="text-primary" size={40} />
                    </div>
                    <div>
                        <h1 className="text-6xl font-black tracking-tighter text-primary leading-none mb-2">Discovery</h1>
                        <p className="text-xl text-on-surface-variant font-medium tracking-tight">Powered by Last.fm</p>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="relative w-full max-w-xl">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant" size={24} />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search global artists..."
                        className="w-full h-16 pl-16 pr-8 rounded-full bg-surface-variant/30 border border-white/10 focus:ring-2 focus:ring-primary/50 text-xl font-bold tracking-tight outline-none"
                    />
                </form>
            </header>

            {/* Tab Switches */}
            <div className="flex gap-4 px-4 overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveTab('trending')}
                    className={clsx(
                        "px-8 py-4 rounded-full font-black uppercase tracking-widest text-xs transition-all",
                        activeTab === 'trending' ? "bg-primary text-on-primary shadow-lg scale-105" : "bg-surface-variant/30 text-on-surface-variant hover:bg-surface-variant/60"
                    )}
                >
                    Trending Charts
                </button>
                {searchResults.length > 0 && (
                    <button
                        onClick={() => setActiveTab('search')}
                        className={clsx(
                            "px-8 py-4 rounded-full font-black uppercase tracking-widest text-xs transition-all",
                            activeTab === 'search' ? "bg-primary text-on-primary shadow-lg scale-105" : "bg-surface-variant/30 text-on-surface-variant hover:bg-surface-variant/60"
                        )}
                    >
                        Search Results
                    </button>
                )}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'trending' ? (
                    <motion.div
                        key="trending"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-12 px-4"
                    >
                        {/* Top Artists */}
                        <section className="space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-2xl">
                                    <User className="text-primary" size={24} />
                                </div>
                                <h3 className="text-3xl font-black tracking-tighter">Global Top Artists</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                {topArtists.map((artist, i) => (
                                    <ArtistCard key={artist.name + i} artist={artist} rank={i + 1} />
                                ))}
                            </div>
                        </section>

                        {/* Top Tracks */}
                        <section className="space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-secondary/10 rounded-2xl">
                                    <Music className="text-secondary" size={24} />
                                </div>
                                <h3 className="text-3xl font-black tracking-tighter">Global Top Tracks</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                {topTracks.map((track, i) => (
                                    <TrackCard key={track.name + i} track={track} rank={i + 1} />
                                ))}
                            </div>
                        </section>
                    </motion.div>
                ) : (
                    <motion.div
                        key="search"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 px-4"
                    >
                        {searchResults.map((artist, i) => (
                            <div key={artist.name + i} className="group bg-surface-variant/20 rounded-[2.5rem] p-6 border border-white/5 hover:bg-primary/5 hover:border-primary/20 transition-all text-center space-y-4">
                                <div className="w-24 h-24 rounded-full bg-primary/10 mx-auto flex items-center justify-center overflow-hidden border-4 border-white/5">
                                    {artist.image?.find(img => img.size === 'large')?.['#text'] ? (
                                        <img src={artist.image.find(img => img.size === 'large')?.['#text']} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="text-primary opacity-30" size={40} />
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-black text-lg line-clamp-1">{artist.name}</h4>
                                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{parseInt(artist.listeners || '0').toLocaleString()} Listeners</p>
                                </div>
                                <a
                                    href={artist.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-white/5 rounded-full hover:bg-primary hover:text-on-primary transition-all"
                                >
                                    Last.fm <ExternalLink size={10} />
                                </a>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const ArtistCard = ({ artist, rank }: { artist: Artist, rank: number }) => (
    <div className="group flex items-center gap-6 p-4 bg-surface-variant/20 rounded-3xl border border-white/5 hover:bg-primary/5 hover:border-primary/20 transition-all">
        <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center font-black text-2xl text-on-surface-variant/20 group-hover:text-primary transition-colors italic">
            #{rank}
        </div>
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex-shrink-0 overflow-hidden">
            {artist.image?.find(img => img.size === 'medium')?.['#text'] ? (
                <img src={artist.image.find(img => img.size === 'medium')?.['#text']} className="w-full h-full object-cover" />
            ) : <User className="text-primary opacity-20 m-auto mt-4" />}
        </div>
        <div className="flex-1 min-w-0">
            <h4 className="font-black text-xl truncate">{artist.name}</h4>
            <div className="flex items-center gap-3 text-xs font-bold text-on-surface-variant/60">
                <span>{parseInt(artist.listeners).toLocaleString()} MLN LISTENERS</span>
            </div>
        </div>
        <a href={artist.url} target="_blank" rel="noreferrer" className="p-3 bg-white/5 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-on-primary">
            <ExternalLink size={18} />
        </a>
    </div>
);

const TrackCard = ({ track, rank }: { track: Track, rank: number }) => (
    <div className="group flex items-center gap-6 p-4 bg-surface-variant/20 rounded-3xl border border-white/5 hover:bg-secondary/5 hover:border-secondary/20 transition-all">
        <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center font-black text-2xl text-on-surface-variant/20 group-hover:text-secondary transition-colors italic">
            #{rank}
        </div>
        <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex-shrink-0 overflow-hidden">
            {track.image?.find(img => img.size === 'medium')?.['#text'] ? (
                <img src={track.image.find(img => img.size === 'medium')?.['#text']} className="w-full h-full object-cover" />
            ) : <Music className="text-secondary opacity-20 m-auto mt-4" />}
        </div>
        <div className="flex-1 min-w-0">
            <h4 className="font-black text-xl truncate">{track.name}</h4>
            <p className="text-sm font-bold text-secondary uppercase tracking-tighter opacity-70 group-hover:opacity-100">{track.artist.name}</p>
        </div>
        <a href={track.url} target="_blank" rel="noreferrer" className="p-3 bg-white/5 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-secondary hover:text-on-secondary">
            <ExternalLink size={18} />
        </a>
    </div>
);

export default LastFMPage;
