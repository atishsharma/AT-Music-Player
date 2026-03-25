import { useState, useMemo } from 'react';
import { Play, ArrowUpDown } from 'lucide-react';
import { toAtmusicUrl } from '../../utils/path';
import clsx from 'clsx';

interface SongGridProps {
    tracks: any[];
    onPlay: (track: any) => void;
}

type SortKey = 'default' | 'title' | 'artist' | 'album' | 'date' | 'duration';

const SongGrid = ({ tracks, onPlay }: SongGridProps) => {
    const [sortKey, setSortKey] = useState<SortKey>('default');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [gridSize, setGridSize] = useState(160);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortOrder('asc');
        }
    };

    const sortedTracks = useMemo(() => {
        if (sortKey === 'default') return tracks;
        return [...tracks].sort((a, b) => {
            let valA: any = a[sortKey as keyof typeof a] || '';
            let valB: any = b[sortKey as keyof typeof b] || '';

            if (sortKey === 'duration') {
                valA = a.duration || 0;
                valB = b.duration || 0;
            } else if (sortKey === 'date') {
                valA = a.date || a.id || '';
                valB = b.date || b.id || '';
            } else {
                valA = String(valA).toLowerCase();
                valB = String(valB).toLowerCase();
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [tracks, sortKey, sortOrder]);

    if (tracks.length === 0) {
        return (
            <div className="text-center py-20 text-on-surface-variant/50">
                <p>No songs found</p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between gap-4 px-1 flex-wrap mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mr-1">Sort</span>
                    {(['default', 'title', 'artist', 'album', 'duration'] as SortKey[]).map(key => (
                        <button
                            key={key}
                            onClick={() => toggleSort(key)}
                            className={clsx(
                                "flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors outline outline-1",
                                sortKey === key ? "bg-primary text-on-primary outline-primary shadow-sm" : "bg-primary/5 text-on-surface-variant/70 outline-primary/20 hover:text-primary hover:bg-primary/10"
                            )}
                        >
                            {key === 'default' ? 'Default' : key.charAt(0).toUpperCase() + key.slice(1)}
                            {sortKey === key && key !== 'default' && <ArrowUpDown size={12} className="ml-1" />}
                        </button>
                    ))}
                </div>
                
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Dimensions</span>
                    <div className="relative flex items-center w-24">
                        <input
                            type="range"
                            min="100"
                            max="300"
                            step="10"
                            value={gridSize}
                            onChange={(e) => setGridSize(Number(e.target.value))}
                            className="w-full h-1.5 bg-primary/20 rounded-lg appearance-none cursor-pointer hover:bg-primary/30 outline-none transition-all"
                            style={{ 
                                accentColor: 'var(--md-sys-color-primary)', 
                                padding: 0 
                            }}
                        />
                    </div>
                </div>
            </div>

            <div 
                className="grid gap-6 transition-all duration-300" 
                style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${gridSize}px, 1fr))` }}
            >
                {sortedTracks.map((track) => (
                <div
                    key={track.id}
                    className="bg-surface-variant/20 rounded-3xl p-4 hover:bg-surface-variant/40 transition-all duration-300 group cursor-pointer border border-white/5"
                    onClick={() => onPlay(track)}
                >
                    <div className="w-full aspect-square rounded-2xl overflow-hidden mb-4 relative shadow-md bg-surface-variant">
                        {track.image_path || track.thumbnail ? (
                            <img
                                src={(track.image_path || track.thumbnail)?.startsWith('http') ? (track.image_path || track.thumbnail) : toAtmusicUrl(track.image_path || track.thumbnail)}
                                alt={track.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-primary/30 bg-primary/5">
                                <Play size={32} />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-xl">
                                <Play size={20} fill="currentColor" className="ml-0.5" />
                            </div>
                        </div>
                    </div>
                    <h3 className="font-bold text-on-surface truncate text-sm mb-1">{track.title}</h3>
                    <p className="text-[10px] text-on-surface-variant truncate uppercase tracking-widest font-black">{track.artist}</p>
                </div>
            ))}
            </div>
        </div>
    );
};

export default SongGrid;
