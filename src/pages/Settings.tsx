import { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useThemeStore } from '../store/themeStore';
import { Globe, Sparkles, ShieldCheck, Sun, Moon, Zap, FolderPlus, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import SettingSpinner from '../components/settings/SettingSpinner';

const SettingsPage = () => {
    const {
        lastfmKey,
        youtubeApiKey,
        downloadPath,
        fetchSettings,
        setLastfmKey,
        setYoutubeApiKey,
        setDownloadPath
    } = useSettingsStore();

    const { currentMood, appearance, setAppearance, generateLuckyTheme, setMood, zoomLevel, setZoomLevel, luckyTheme } = useThemeStore();

    const [tempKey, setTempKey] = useState('');
    const [ytKey, setYtKey] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    useEffect(() => {
        setTempKey(lastfmKey);
        setYtKey(youtubeApiKey);
    }, [lastfmKey, youtubeApiKey]);

    // Auto-save effect with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (
                tempKey !== lastfmKey ||
                ytKey !== youtubeApiKey
            ) {
                setLastfmKey(tempKey);
                setYoutubeApiKey(ytKey);
            }
        }, 1000); // 1 second debounce

        return () => clearTimeout(timer);
    }, [tempKey, ytKey]);


    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 max-w-full mx-auto space-y-12 pb-32"
        >
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="hidden lg:flex items-center justify-center w-28 h-28 bg-surface-variant/40 backdrop-blur-xl rounded-[2.5rem] outline outline-1 outline-primary shadow-lg hover:bg-surface-variant/50 transition-all group shrink-0 relative overflow-hidden">
                            <img src="./app_icon.png" alt="Logo" className="w-[80%] h-[80%] object-cover rounded-full group-hover:rotate-12 transition-transform" />
                        </div>
                        <div>
                            <h1 className="text-6xl font-black tracking-tighter text-primary leading-none mb-2">
                                Preferences
                            </h1>
                            <p className="text-xl text-on-surface-variant font-medium tracking-tight">Customize your Experience & API Integrations.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className={clsx(
                            "px-8 py-4 bg-surface-variant/30 rounded-full border border-white/10 flex items-center gap-4 backdrop-blur-md shadow-xl mb-2",
                            appearance === 'light' && "outline outline-1 outline-primary"
                        )}>
                            <p className="text-xs uppercase font-black tracking-[0.2em] text-on-surface-variant">Theme</p>
                            <div className={clsx(
                                "w-px h-6",
                                appearance === 'light' ? "bg-primary" : "bg-white/10"
                            )} />
                            <p className="text-xl font-black text-primary capitalize tracking-tight">{currentMood}</p>
                        </div>
                        <SettingSpinner />
                    </div>
                </div>
            </div>

            {/* Layout Scaler */}
            <div className="lg:col-span-2 flex flex-col md:flex-row items-center gap-6 py-4 px-2 mb-6 border-b border-white/5 pb-8 -mt-[20px]">
                <div className="flex items-center gap-3 whitespace-nowrap min-w-[150px]">
                    <Monitor className="text-primary" size={24} />
                    <h2 className="text-xl font-black text-on-surface tracking-tight">Layout Scaler</h2>
                </div>
                <div className="flex-1 w-full relative h-[3.5rem] flex items-center group cursor-pointer px-4">
                    <div className="absolute inset-x-4 flex items-center">
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden relative shadow-inner">
                            <div
                                className="absolute left-0 h-full bg-primary transition-all duration-300 ease-out"
                                style={{ width: `${([0.9, 1, 1.1, 1.25, 1.5].indexOf(zoomLevel || 1) / 4) * 100}%` }}
                            />
                        </div>
                    </div>
                    <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none z-10">
                        {[0.9, 1, 1.1, 1.25, 1.5].map((val, idx) => {
                            const names = ["Tiny", "Normal", "Large", "Huge", "Max"];
                            const isSelected = zoomLevel === val;
                            return (
                                <div key={val} className="flex flex-col items-center relative w-0">
                                    <div className={clsx(
                                        "w-2.5 h-2.5 rounded-full transition-all duration-300 z-10",
                                        isSelected ? "bg-primary shadow-lg scale-[3]" : "bg-white/30"
                                    )} />
                                    <div className="absolute top-5 flex flex-col items-center">
                                        <span className={clsx(
                                            "text-[10px] uppercase tracking-widest font-black transition-colors whitespace-nowrap",
                                            isSelected ? "text-primary" : "text-on-surface-variant/50"
                                        )}>{names[idx]}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="4"
                        step="1"
                        value={[0.9, 1, 1.1, 1.25, 1.5].indexOf(zoomLevel || 1)}
                        onChange={(e) => setZoomLevel([0.9, 1, 1.1, 1.25, 1.5][Number(e.target.value)])}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    />
                </div>
                <div className="whitespace-nowrap px-4 w-24 flex justify-end">
                    <span className="text-2xl font-black tracking-widest text-primary">{Math.round((zoomLevel || 1) * 100)}%</span>
                </div>
            </div>

            {/* Download Location */}
            <div className="lg:col-span-2 bg-surface-variant/20 backdrop-blur-xl rounded-[3rem] p-8 border border-white/5 flex flex-col md:flex-row md:items-center gap-6 justify-between mt-8">
                <div className="flex items-center gap-4 whitespace-nowrap">
                    <div className="p-4 bg-primary/10 rounded-[1.5rem]">
                        <FolderPlus className="text-primary" size={24} />
                    </div>
                    <h2 className="text-2xl font-black text-on-surface">Download Location</h2>
                </div>
                <div className="flex-1 flex flex-col md:flex-row md:items-center gap-4 w-full">
                    <div className="flex-1 w-full bg-surface-variant/5 border border-outline/10 rounded-[1.5rem] px-6 py-4 text-sm text-on-surface font-mono overflow-hidden whitespace-nowrap flex items-center h-[56px]">
                        <span className="truncate w-full block">
                            {downloadPath || 'Default: App Data Folder'}
                        </span>
                    </div>
                    <button
                        onClick={async () => {
                            const path = await window.ipcRenderer.invoke('dialog:openDirectory');
                            if (path) {
                                setDownloadPath(path);
                                setMessage('Folder updated!');
                                setTimeout(() => setMessage(''), 3000);
                            }
                        }}
                        className="px-8 bg-primary text-on-primary rounded-[1.5rem] font-black uppercase tracking-widest text-xs transition-all hover:scale-105 h-[56px]"
                    >
                        Change Folder
                    </button>
                </div>
            </div>

            {/* Theme & Appearance */}
            <div className="lg:col-span-2 bg-surface-variant/20 backdrop-blur-xl rounded-[3rem] p-10 border border-outline/10 space-y-8 hover:bg-surface-variant/30 transition-all mt-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-primary/10 rounded-[1.5rem]">
                            <Sparkles className="text-primary" size={24} />
                        </div>
                        <h2 className="text-2xl font-black text-on-surface">Theme & Appearance</h2>
                    </div>
                    <div className="flex items-center gap-3 bg-surface-variant/30 p-2 rounded-full border border-white/5 outline outline-1 outline-primary">
                        {(['light', 'dark', 'oled'] as const).map((a) => (
                            <button
                                key={a}
                                onClick={() => setAppearance(a)}
                                className={clsx(
                                    "flex items-center justify-center w-[56px] h-[56px] rounded-full transition-all border-2",
                                    appearance === a ? "bg-primary text-on-primary border-transparent shadow-lg scale-105" : "text-on-surface-variant border-transparent hover:bg-surface-variant/50"
                                )}
                            >
                                {a === 'light' && <Sun size={20} />}
                                {a === 'dark' && <Moon size={20} />}
                                {a === 'oled' && <Zap size={20} />}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex flex-wrap gap-4">
                    {([
                        { type: 'calm', color: '#007AFF', label: 'Blue' },
                        { type: 'energetic', color: '#FF9500', label: 'Orange' },
                        { type: 'focus', color: '#00C7BE', label: 'Teal' },
                        { type: 'sad', color: '#5856D6', label: 'Indigo' },
                        { type: 'party', color: '#FF2D55', label: 'Pink' },
                        { type: 'lucky', color: 'linear-gradient(45deg, #ff00cc, #3333ff)', label: 'Feeling Lucky 🎲' }
                    ] as const).map((m) => (
                        <button
                            key={m.type}
                            onClick={() => {
                                if (m.type === 'lucky') generateLuckyTheme();
                                else setMood(m.type as any);
                            }}
                            className={clsx(
                                "flex items-center justify-center gap-3 px-6 h-[56px] rounded-[1.5rem] transition-all font-bold border border-transparent shadow-sm hover:shadow-md",
                                currentMood === m.type ? "bg-primary text-on-primary scale-105" : "bg-surface-variant/50 text-on-surface-variant hover:bg-surface-variant"
                            )}
                        >
                            <div className="w-5 h-5 rounded-full border border-white/10" style={{ background: m.color }} />
                            {m.type === 'lucky' && currentMood === 'lucky' && luckyTheme ? luckyTheme.name : m.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* API Engines */}
            <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                <div className="bg-surface-variant/20 backdrop-blur-xl rounded-[3rem] p-10 border border-white/5 space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-primary/10 rounded-[1.5rem]">
                            <Globe className="text-primary" size={24} />
                        </div>
                        <h2 className="text-2xl font-black text-on-surface">YouTube Engine</h2>
                    </div>
                    <input
                        type="password"
                        value={ytKey}
                        onChange={(e) => setYtKey(e.target.value)}
                        placeholder="YouTube API Key"
                        className="w-full bg-surface-variant/5 border border-outline/10 rounded-[1.5rem] px-6 py-4 text-on-surface font-mono"
                    />
                </div>
                <div className="bg-surface-variant/20 backdrop-blur-xl rounded-[3rem] p-10 border border-white/5 space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-primary/10 rounded-[1.5rem]">
                            <img src="./last-fm.png" alt="Last.fm" className="h-6" />
                        </div>
                        <h2 className="text-2xl font-black text-on-surface">Last.fm Engine</h2>
                    </div>
                    <input
                        type="password"
                        value={tempKey}
                        onChange={(e) => setTempKey(e.target.value)}
                        placeholder="Last.fm API Key"
                        className="w-full bg-surface-variant/5 border border-outline/10 rounded-[1.5rem] px-6 py-4 text-on-surface font-mono"
                    />
                </div>
            </div>

            {/* Footer & Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                <div className="bg-surface-variant/20 backdrop-blur-xl rounded-[3rem] p-10 border border-white/5 flex flex-col justify-center items-start gap-4 hover:bg-surface-variant/30 transition-all group overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16" />
                    <h3 className="text-sm font-black uppercase tracking-[0.3em] text-on-surface-variant/60">Designed By</h3>
                    <div className="w-full flex items-center justify-between">
                        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">Atish Ak Sharma</h2>
                        <img src="./ats-logo.png" alt="Logo" className="w-24 h-24 rounded-full border-4 border-white shadow-2xl object-cover" />
                    </div>
                </div>

                <div className="bg-surface-variant/20 backdrop-blur-xl rounded-[3rem] p-10 border border-white/5 flex flex-col justify-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-green-500/10 rounded-[1.5rem]">
                            <ShieldCheck className="text-green-500" size={24} />
                        </div>
                        <p className="text-xl font-black text-on-surface">MIT License</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-primary/10 rounded-[1.5rem]">
                            <Zap className="text-primary" size={24} />
                        </div>
                        <p className="text-xl font-black text-primary">v1.2.1</p>
                    </div>
                </div>

                {/* Final App Branding */}
                <div className="md:col-span-2 flex flex-col items-center gap-8 pt-12">
                    <a
                        href="https://github.com/atishsharma/AT-Music-Player/"
                        target="_blank"
                        rel="noreferrer"
                        className="block hover:scale-105 transition-all active:scale-95"
                    >
                        <div className="outline outline-1 outline-primary p-8 rounded-[3rem] shadow-2xl bg-surface/30 backdrop-blur-xl group flex flex-col items-center gap-4">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex shadow-lg items-center justify-center overflow-hidden border border-primary/20 group-hover:rotate-12 transition-transform">
                                    <img src="./app_icon.png" alt="Logo" className="w-full h-full object-cover" />
                                </div>
                                <h2 className="text-4xl font-black text-primary tracking-tighter">AT Music Pro</h2>
                            </div>
                            <span className="text-xs font-black uppercase tracking-[0.3em] text-on-surface-variant/60">Premium Edition</span>
                        </div>
                    </a>
                </div>
            </div>

            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="fixed bottom-12 right-12 bg-primary text-on-primary px-8 py-4 rounded-full shadow-2xl font-black z-[200]"
                    >
                        {message}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default SettingsPage;
