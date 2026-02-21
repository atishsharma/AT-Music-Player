import { useEffect, useState } from 'react';
import { Play, Clock, ArrowRight } from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore';
import { useNavigate } from 'react-router-dom';
import { toAtmusicUrl } from '../../utils/path';

const RecentlyPlayed = () => {
    const [recent, setRecent] = useState<any[]>([]);
    const [visibleCount, setVisibleCount] = useState(7);
    const { play } = usePlayerStore();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchRecent = async () => {
            try {
                const data = await window.ipcRenderer.invoke('library:getRecentlyPlayed', 14);
                // Deduplicate by id or title+artist
                const unique = data.reduce((acc: any[], current: any) => {
                    const x = acc.find(item => item.id === current.id || (item.title === current.title && item.artist === current.artist));
                    if (!x) return acc.concat([current]);
                    else return acc;
                }, []);
                setRecent(unique);
            } catch (err) {
                console.error("Failed to fetch recent history", err);
            }
        };
        fetchRecent();
    }, []);

    if (recent.length === 0) return null;

    const visibleItems = recent.slice(0, Math.min(visibleCount, 14));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Clock size={20} className="text-primary" /> Recently Played
                </h2>
                <div className="flex items-center gap-4">
                    {recent.length > visibleCount && visibleCount < 14 && (
                        <button
                            onClick={() => setVisibleCount(14)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full hover:bg-primary hover:text-on-primary transition-all font-bold text-xs uppercase tracking-widest group"
                        >
                            Load More
                            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    )}
                    <button
                        onClick={() => navigate('/favorites/history')}
                        className="text-xs font-bold text-on-surface-variant/40 hover:text-primary hover:bg-primary hover:text-on-primary px-4 py-2 rounded-full outline outline-1 outline-transparent hover:outline-primary active:bg-primary/80 transition-all uppercase tracking-widest"
                    >
                        View All History
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-6">
                {visibleItems.map((item, idx) => (
                    <div
                        key={`${item.id}-${idx}`}
                        className="group cursor-pointer"
                        onClick={() => play(item)}
                    >
                        <div className="aspect-square rounded-[2rem] bg-surface-variant overflow-hidden shadow-lg group-hover:shadow-primary/20 group-hover:shadow-2xl transition-all duration-500 relative">
                            {item.image_path ? (
                                <img
                                    src={item.image_path.startsWith('http') ? item.image_path : toAtmusicUrl(item.image_path)}
                                    alt={item.title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                                    <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center">
                                        <Play size={32} className="text-primary/20" />
                                    </div>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="w-12 h-12 rounded-full bg-primary text-on-primary shadow-xl flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                    <Play size={24} fill="currentColor" className="ml-1" />
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 px-2">
                            <h3 className="font-bold text-on-background truncate text-sm" title={item.title}>{item.title}</h3>
                            <p className="text-xs text-on-surface-variant/60 truncate font-medium" title={item.artist}>{item.artist}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecentlyPlayed;
