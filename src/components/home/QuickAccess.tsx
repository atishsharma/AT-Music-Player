import { ListMusic } from 'lucide-react';

const QuickAccess = () => {
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
                <ListMusic size={20} className="text-secondary-500" />
                Your Playlists
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-3xl bg-surface-variant/20 hover:bg-surface-variant transition-colors cursor-pointer border border-white/5">
                        <div className="w-16 h-16 rounded-2xl bg-surface-variant shadow-sm"></div>
                        <div>
                            <h4 className="font-bold text-lg">Playlist {i}</h4>
                            <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold">12 songs</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default QuickAccess;
