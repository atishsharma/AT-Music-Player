import { useEffect, useState } from 'react';
import { Sparkles, Play } from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore';
import { useThemeStore } from '../../store/themeStore';

const Recommended = () => {
    const [recommended, setRecommended] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { play } = usePlayerStore();
    const { currentMood } = useThemeStore();

    useEffect(() => {
        const fetchRecommended = async () => {
            setIsLoading(true);
            try {
                const cacheKey = `recommended-${currentMood}`;
                const cached = localStorage.getItem(cacheKey);
                const today = new Date().toDateString();

                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (parsed.date === today) {
                        setRecommended(parsed.songs);
                        setIsLoading(false);
                        return;
                    }
                }

                // Enhanced recommendation logic: Top Song + Mixed Languages + Mood + Official Music
                const moodQuery = `Top Song English or Hindi Or Punjabi For ${currentMood} Mood Official Music`;
                const data = await window.ipcRenderer.invoke('youtube:search', moodQuery);

                // Filter for unique artists and take top 5 most viewed/relevant
                const uniqueArtistsSongs: any[] = [];
                const seenArtists = new Set<string>();

                for (const item of data) {
                    if (!item.artist) continue;
                    const artistNormalized = item.artist.toLowerCase().trim();
                    if (!seenArtists.has(artistNormalized)) {
                        uniqueArtistsSongs.push(item);
                        seenArtists.add(artistNormalized);
                    }
                    if (uniqueArtistsSongs.length === 5) break;
                }

                setRecommended(uniqueArtistsSongs);
                localStorage.setItem(cacheKey, JSON.stringify({
                    date: today,
                    songs: uniqueArtistsSongs
                }));
            } catch (err) {
                console.error("Failed to fetch recommendations", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchRecommended();
    }, [currentMood]);



    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold px-1 flex items-center gap-2">
                <Sparkles size={20} className="text-yellow-500" /> Recommended for You
            </h2>
            
            {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="bg-surface-variant/10 rounded-3xl p-4 border border-white/5 animate-pulse">
                            <div className="w-full aspect-square rounded-2xl bg-surface-variant/30 mb-4" />
                            <div className="h-4 bg-surface-variant/30 rounded-full w-3/4 mb-2" />
                            <div className="h-3 bg-surface-variant/30 rounded-full w-1/2" />
                        </div>
                    ))}
                </div>
            ) : recommended.length === 0 ? (
                <div className="h-32 rounded-[2rem] border border-dashed border-primary/20 bg-primary/5 flex flex-col items-center justify-center text-primary/50">
                    <Sparkles size={24} className="mb-2 opacity-50" />
                    <p className="font-bold text-sm">No recommendations available</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {recommended.map((item) => (
                        <div
                            key={item.video_id}
                        className="bg-surface-variant/20 rounded-3xl p-4 hover:bg-surface-variant/40 transition-all duration-300 group cursor-pointer border border-white/5"
                        onClick={() => play({
                            id: item.video_id,
                            title: item.title,
                            artist: item.artist,
                            image_path: item.thumbnail,
                            source: 'youtube',
                            album: 'YouTube',
                            duration: 0,
                            path: '',
                            format: 'youtube'
                        } as any)}
                    >
                        <div className="w-full aspect-square rounded-2xl overflow-hidden mb-4 relative shadow-md">
                            <img
                                src={item.thumbnail}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-xl">
                                    <Play size={20} fill="currentColor" className="ml-0.5" />
                                </div>
                            </div>
                        </div>
                        <h3 className="font-bold text-on-background truncate mb-1" title={item.title}>{item.title}</h3>
                        <p className="text-xs text-on-surface-variant truncate uppercase tracking-wider" title={item.artist}>{item.artist}</p>
                    </div>
                ))}
            </div>
            )}
        </div>
    );
};

export default Recommended;
