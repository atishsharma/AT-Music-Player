import { useEffect, useState } from 'react';
import { Play, TrendingUp } from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore';
import { useSettingsStore } from '../../store/settingsStore';

const Trending = () => {
    const [trending, setTrending] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { play } = usePlayerStore();
    const { youtubeApiKey } = useSettingsStore();

    useEffect(() => {
        const fetchTrending = async () => {
            if (!youtubeApiKey) return;
            
            setIsLoading(true);
            try {
                const cacheKey = 'youtube-trending-5';
                const cached = localStorage.getItem(cacheKey);
                const today = new Date().toDateString();

                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (parsed.date === today) {
                        setTrending(parsed.songs);
                        setIsLoading(false);
                        return;
                    }
                }

                // Call the existing youtube:getRecommendations or a new handler?
                // For now, let's use the search API with a "trending" query to get top 5 music
                // Or we can add a new IPC handler. Since I can't easily add a new Google API call 
                // without modifying main/ipc, let's use a specific trending search.
                const data = await window.ipcRenderer.invoke('youtube:search', 'trending music 2026');
                
                const top5 = data.slice(0, 5).map((item: any) => ({
                    video_id: item.id || item.video_id,
                    title: item.title,
                    artist: item.artist || item.channelTitle,
                    thumbnail: item.thumbnail || item.thumbnails?.high?.url || item.image_path,
                }));

                setTrending(top5);
                localStorage.setItem(cacheKey, JSON.stringify({
                    date: today,
                    songs: top5
                }));
            } catch (err) {
                console.error("Failed to fetch trending songs", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTrending();
    }, [youtubeApiKey]);

    if (!youtubeApiKey) return null;

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold px-1 flex items-center gap-2">
                <TrendingUp size={20} className="text-primary" /> Trending Music
            </h2>
            
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="bg-surface-variant/10 rounded-2xl p-3 border border-white/5 animate-pulse flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-surface-variant/30 shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 bg-surface-variant/30 rounded-full w-3/4" />
                                <div className="h-2 bg-surface-variant/30 rounded-full w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {trending.map((item) => (
                        <div
                            key={item.video_id}
                            className="bg-surface-variant/20 rounded-2xl p-3 hover:bg-surface-variant/40 transition-all duration-300 group cursor-pointer border border-white/5 flex items-center gap-4"
                            onClick={() => play({
                                id: item.video_id,
                                title: item.title,
                                artist: item.artist,
                                image_path: item.thumbnail,
                                source: 'youtube',
                                album: 'Trending',
                                duration: 0,
                                path: '',
                                format: 'youtube'
                            } as any)}
                        >
                            <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 relative shadow-md">
                                <img
                                    src={item.thumbnail}
                                    alt={item.title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Play size={16} fill="currentColor" className="text-white" />
                                </div>
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-sm text-on-background truncate mb-0.5" title={item.title}>{item.title}</h3>
                                <p className="text-[10px] text-on-surface-variant/70 truncate uppercase tracking-widest font-black" title={item.artist}>{item.artist}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Trending;
