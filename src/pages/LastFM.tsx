import { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Music, User, ExternalLink, Globe2, X } from 'lucide-react';
import clsx from 'clsx';
import axios from 'axios';

const REGIONS = [
    { value: 'global', label: 'Worldwide' },
    { value: 'united states', label: 'United States' },
    { value: 'united kingdom', label: 'United Kingdom' },
    { value: 'japan', label: 'Japan' },
    { value: 'south korea', label: 'South Korea' },
    { value: 'india', label: 'India' },
    { value: 'germany', label: 'Germany' },
    { value: 'france', label: 'France' },
    { value: 'brazil', label: 'Brazil' },
    { value: 'canada', label: 'Canada' },
    { value: 'australia', label: 'Australia' }
];

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

    const [region, setRegion] = useState('global');

    const fetchTopCharts = async () => {
        if (!lastfmKey) return;

        try {
            let artRes, trackRes;
            if (region === 'global') {
                [artRes, trackRes] = await Promise.all([
                    axios.get(`https://ws.audioscrobbler.com/2.0/?method=chart.gettopartists&api_key=${lastfmKey}&format=json&limit=10`),
                    axios.get(`https://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&api_key=${lastfmKey}&format=json&limit=10`)
                ]);
                setTopArtists(artRes.data.artists.artist);
                setTopTracks(trackRes.data.tracks.track);
            } else {
                [artRes, trackRes] = await Promise.all([
                    axios.get(`https://ws.audioscrobbler.com/2.0/?method=geo.gettopartists&country=${encodeURIComponent(region)}&api_key=${lastfmKey}&format=json&limit=10`),
                    axios.get(`https://ws.audioscrobbler.com/2.0/?method=geo.gettoptracks&country=${encodeURIComponent(region)}&api_key=${lastfmKey}&format=json&limit=10`)
                ]);
                setTopArtists(artRes.data.topartists.artist);
                setTopTracks(artRes.data.toptracks ? artRes.data.toptracks.track : trackRes.data.tracks.track); // Lastfm API uses tracks.track globally but sometimes toptracks

                // Fix: Last.fm returns geo tracks slightly differently.
                if (trackRes.data.tracks && trackRes.data.tracks.track) setTopTracks(trackRes.data.tracks.track);
                else if (trackRes.data.toptracks && trackRes.data.toptracks.track) setTopTracks(trackRes.data.toptracks.track);
            }
        } catch (err) {
            console.error(err);
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
        }
    };

    useEffect(() => {
        if (lastfmKey) {
            fetchTopCharts();
        }
    }, [lastfmKey, region]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12 pb-32 max-w-7xl mx-auto pt-12 px-4"
        >
            {/* Header */}
            <header className="relative flex flex-col md:flex-row md:items-center justify-between gap-8 pt-10 px-8 py-8 bg-surface-variant/10 rounded-[3rem] border border-primary/20 outline outline-1 outline-primary/10 shadow-2xl backdrop-blur-xl mx-4">
                <div className="flex items-center gap-6">
                    <div className="p-3 bg-primary/10 rounded-[2rem] border border-primary/30 shadow-2xl shadow-primary/20 flex items-center justify-center w-20 h-20 overflow-hidden outline outline-1 outline-primary/10">
                        <img src="/last-fm.png" alt="Last.fm" className="w-[85%] h-[85%] object-contain filter drop-shadow-[0_0_8px_rgba(255,0,0,0.5)]" />
                    </div>
                    <div>
                        <h1 className="text-5xl font-black tracking-tighter text-primary leading-none italic">Discovery</h1>
                        <p className="text-[10px] text-on-surface-variant font-black tracking-[0.3em] opacity-60">Powered By Last.fm</p>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="relative flex-1 max-w-2xl group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-primary opacity-50 group-focus-within:opacity-100 transition-opacity">
                        <Search size={22} />
                    </div>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search global artists or tracks..."
                        className="w-full h-16 pl-16 pr-14 rounded-2xl bg-primary/5 border border-primary/40 focus:border-primary focus:ring-4 focus:ring-primary/20 text-xl font-black tracking-tight outline outline-1 outline-primary/10 focus:outline-primary/30 transition-all placeholder:text-primary/30 text-primary shadow-2xl shadow-primary/5"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl text-primary/50 hover:text-primary hover:bg-primary/10 transition-all active:scale-90"
                        >
                            <X size={20} />
                        </button>
                    )}
                </form>
            </header >

            <div className="flex flex-wrap items-center gap-4 px-4 overflow-x-auto no-scrollbar">
                <div className="flex bg-surface-variant/30 p-1 rounded-full">
                    <button
                        onClick={() => setActiveTab('trending')}
                        className={clsx(
                            "px-8 py-3 rounded-full font-black uppercase tracking-widest text-xs transition-all",
                            activeTab === 'trending' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/60"
                        )}
                    >
                        Trending Charts
                    </button>
                    {searchResults.length > 0 && (
                        <button
                            onClick={() => setActiveTab('search')}
                            className={clsx(
                                "px-8 py-3 rounded-full font-black uppercase tracking-widest text-xs transition-all",
                                activeTab === 'search' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/60"
                            )}
                        >
                            Search Results
                        </button>
                    )}
                </div>

                {activeTab === 'trending' && (
                    <div className="flex items-center gap-3 bg-surface-variant/30 pl-4 pr-1 py-1 rounded-full border border-white/5">
                        <Globe2 size={16} className="text-on-surface-variant" />
                        <select
                            value={region}
                            onChange={(e) => setRegion(e.target.value)}
                            className="bg-transparent border-none font-bold text-on-surface outline-none cursor-pointer uppercase tracking-widest text-xs py-2 pr-4 appear"
                        >
                            {REGIONS.map(r => (
                                <option key={r.value} value={r.value} className="bg-surface text-on-surface uppercase">{r.label}</option>
                            ))}
                        </select>
                    </div>
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
                                <h3 className="text-3xl font-black tracking-tighter capitalize">{region === 'global' ? 'Global' : region} Top Artists</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                {topArtists?.map((artist, i) => (
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
                                <h3 className="text-3xl font-black tracking-tighter capitalize">{region === 'global' ? 'Global' : region} Top Tracks</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                {topTracks?.map((track, i) => (
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

            <footer className="pt-20 pb-8 text-center opacity-40 hover:opacity-100 transition-opacity">
                <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant flex items-center justify-center gap-2">
                    Thanks to <a href="https://last.fm" target="_blank" rel="noreferrer" className="text-[#D51007] hover:opacity-80 transition-opacity flex items-center gap-2">
                        <img src="/last-fm.png" alt="Last.fm" className="h-6 object-contain" />
                    </a> for providing the discovery API.
                </p>
            </footer>
        </motion.div >
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
