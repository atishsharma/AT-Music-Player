import { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useThemeStore } from '../store/themeStore';
import { Key, Globe, Sparkles, ShieldCheck, Sun, Moon, Zap, FolderPlus } from 'lucide-react';
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

    const { currentMood, appearance, setAppearance, luckyTheme, generateLuckyTheme, setMood } = useThemeStore();

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
                        <a
                            href="https://github.com/atishsharma/AT-Music-Player/"
                            target="_blank"
                            rel="noreferrer"
                            className="hidden lg:flex items-center justify-center w-28 h-28 bg-surface-variant/40 backdrop-blur-xl rounded-[2.5rem] outline outline-1 outline-primary shadow-lg hover:bg-surface-variant/50 transition-all group shrink-0"
                        >
                            <div className="w-[90%] h-[90%] rounded-full bg-primary/10 flex items-center justify-center overflow-hidden group-hover:rotate-12 transition-transform">
                                <img src="/app_icon.png" alt="Logo" className="w-full h-full object-cover" />
                            </div>
                        </a>
                        <div>
                            <h1 className="text-6xl font-black tracking-tighter text-[rgb(var(--md-sys-color-primary))] leading-none mb-2">
                                Preferences
                            </h1>
                            <p className="text-xl text-on-surface-variant font-medium tracking-tight">Customize your playback experience & cloud integrations.</p>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                {/* Primary Color / Mood Selector */}

                {/* Primary Color / Mood Selector */}
                <div className="lg:col-span-2 bg-surface-variant/20 backdrop-blur-xl rounded-[3rem] p-10 border border-outline/10 space-y-8 hover:bg-surface-variant/30 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-primary/10 rounded-[1.5rem]">
                            <Sparkles className="text-primary" size={24} />
                        </div>
                        <h2 className="text-2xl font-black text-on-surface">Primary Color</h2>
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
                                    if (m.type === 'lucky') {
                                        generateLuckyTheme();
                                    } else {
                                        setMood(m.type as any);
                                    }
                                }}
                                className={clsx(
                                    "flex items-center gap-3 px-6 py-4 rounded-full transition-all duration-300 font-bold border-2",
                                    currentMood === m.type
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-transparent bg-surface-variant/50 text-on-surface-variant hover:bg-surface-variant"
                                )}
                            >
                                <div className="w-6 h-6 rounded-full shadow-sm" style={{ background: m.color }} />
                                {m.type === 'lucky' && currentMood === 'lucky' && luckyTheme
                                    ? luckyTheme.name
                                    : m.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Appearance Selector */}
                <div className="lg:col-span-2 bg-surface-variant/20 backdrop-blur-xl rounded-[3rem] p-10 border border-outline/10 space-y-8 hover:bg-surface-variant/30 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-primary/10 rounded-[1.5rem]">
                            <Sun className="text-primary" size={24} />
                        </div>
                        <h2 className="text-2xl font-black text-on-surface">Appearance</h2>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {(['light', 'dark', 'oled'] as const).map((a) => {
                            const isLucky = currentMood === 'lucky';
                            const isDisabled = isLucky && a === 'light';
                            return (
                                <button
                                    key={a}
                                    disabled={isDisabled}
                                    onClick={() => setAppearance(a)}
                                    className={clsx(
                                        "flex flex-col items-center gap-4 p-8 rounded-[2.5rem] transition-all duration-300 border-2",
                                        appearance === a
                                            ? "bg-primary text-on-primary border-transparent shadow-xl scale-105"
                                            : "bg-surface-variant/30 text-on-surface-variant border-transparent hover:bg-surface-variant/50",
                                        isDisabled && "opacity-20 cursor-not-allowed grayscale"
                                    )}
                                >
                                    {a === 'light' && <Sun size={32} />}
                                    {a === 'dark' && <Moon size={32} />}
                                    {a === 'oled' && <Zap size={32} />}
                                    <span className="font-black uppercase tracking-widest text-xs">{a}</span>
                                    {isDisabled && <span className="text-[8px] font-bold opacity-60">Not available in Lucky</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Last.fm Section */}

                {/* YouTube & Last.fm Row */}
                <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* YouTube Section */}
                    <div className="bg-surface-variant/20 backdrop-blur-xl rounded-[3rem] p-10 border border-white/5 space-y-8 hover:bg-surface-variant/30 transition-all">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-primary/10 rounded-[1.5rem]">
                                    <Globe className="text-primary" size={24} />
                                </div>
                                <h2 className="text-2xl font-black text-on-surface">YouTube Engine</h2>
                            </div>
                            {ytKey && <span className="text-green-500 font-bold text-xs uppercase tracking-widest animate-pulse">● Connected</span>}
                        </div>
                        <div className="space-y-3">
                            <label className="text-sm font-black uppercase tracking-[0.2em] text-on-surface-variant flex items-center gap-2">
                                Data API Key (v3)
                            </label>
                            <input
                                type="text"
                                value={ytKey}
                                onChange={(e) => setYtKey(e.target.value)}
                                placeholder="Paste your YouTube API key"
                                className="w-full bg-surface-variant/5 border border-outline/10 rounded-[1.5rem] px-6 py-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono text-lg tracking-wider"
                            />
                        </div>
                    </div>

                    {/* Last.fm Section */}
                    <div className="bg-surface-variant/20 backdrop-blur-xl rounded-[3rem] p-10 border border-white/5 space-y-8 hover:bg-surface-variant/30 transition-all">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-primary/10 rounded-[1.5rem]">
                                    <Key className="text-primary" size={24} />
                                </div>
                                <h2 className="text-2xl font-black text-on-surface">Last.fm</h2>
                            </div>
                            {tempKey && <span className="text-green-500 font-bold text-xs uppercase tracking-widest animate-pulse">● Connected</span>}
                        </div>
                        <div className="space-y-3">
                            <label className="text-sm font-black uppercase tracking-[0.2em] text-on-surface-variant flex items-center gap-2">
                                Scrobbling API Key
                            </label>
                            <input
                                type="text"
                                value={tempKey}
                                onChange={(e) => setTempKey(e.target.value)}
                                placeholder="Paste your Last.fm key"
                                className="w-full bg-surface-variant/5 border border-outline/10 rounded-[1.5rem] px-6 py-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono text-lg tracking-wider"
                            />
                        </div>
                    </div>
                </div>


                {/* Download Location Section */}
                <div className="lg:col-span-2 bg-surface-variant/20 backdrop-blur-xl rounded-[3rem] p-10 border border-white/5 space-y-8 hover:bg-surface-variant/30 transition-all">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-primary/10 rounded-[1.5rem]">
                                <FolderPlus className="text-primary" size={24} />
                            </div>
                            <h2 className="text-2xl font-black text-on-surface">Download Location</h2>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                        <div className="flex-1 w-full space-y-3">
                            <label className="text-sm font-black uppercase tracking-[0.2em] text-on-surface-variant flex items-center gap-2">
                                Folder Path
                            </label>
                            <div className="w-full bg-surface-variant/5 border border-outline/10 rounded-[1.5rem] px-6 py-4 text-on-surface font-mono overflow-x-auto whitespace-nowrap">
                                {downloadPath || 'Default: App Data Folder'}
                            </div>
                        </div>
                        <button
                            onClick={async () => {
                                const path = await window.ipcRenderer.invoke('dialog:openDirectory');
                                if (path) {
                                    setDownloadPath(path);
                                    setMessage('Download folder updated!');
                                    setTimeout(() => setMessage(''), 3000);
                                }
                            }}
                            className="px-8 py-4 bg-primary text-on-primary rounded-[1.5rem] font-black uppercase tracking-widest text-xs transition-all hover:scale-105 shadow-lg whitespace-nowrap"
                        >
                            Change Folder
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                <div className="bg-surface-variant/20 backdrop-blur-xl rounded-[3rem] p-10 border border-white/5 flex flex-col justify-center items-start gap-4 hover:bg-surface-variant/30 transition-all group overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/30 transition-all" />

                    <h3 className="text-sm font-black uppercase tracking-[0.3em] text-on-surface-variant/60">Credits</h3>
                    <div className="space-y-1">
                        <p className="text-lg text-on-surface font-medium">Designed & Developed by</p>
                        <a
                            href="https://atishaksharma.com"
                            target="_blank"
                            rel="noreferrer"
                            className="block group-hover:scale-105 transition-transform origin-left"
                        >
                            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500 tracking-tight hover:opacity-80 transition-opacity">
                                Atish Ak Sharma
                            </h2>
                        </a>
                    </div>
                </div>

                <div className="bg-surface-variant/20 backdrop-blur-xl rounded-[3rem] p-10 border border-white/5 flex flex-col justify-center items-start gap-6 hover:bg-surface-variant/30 transition-all">
                    <div className="flex items-center gap-4 w-full">
                        <div className="p-4 bg-green-500/10 rounded-[1.5rem]">
                            <ShieldCheck className="text-green-500" size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-on-surface-variant/60">License</h3>
                            <p className="text-xl font-black text-on-surface">Open Source</p>
                        </div>
                    </div>

                    <div className="w-full h-px bg-white/5" />

                    <div className="flex items-center gap-4 w-full">
                        <div className="p-4 bg-primary/10 rounded-[1.5rem]">
                            <Zap className="text-primary" size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-on-surface-variant/60">Version</h3>
                            <a
                                href="https://github.com/atishsharma/AT-Music-Player/"
                                target="_blank"
                                rel="noreferrer"
                                className="text-xl font-black text-primary hover:text-primary/80 transition-colors hover:underline decoration-2 underline-offset-4"
                            >
                                v1.1.1
                            </a>
                        </div>
                    </div>
                </div>

                {/* Update Button */}
                <div className="md:col-span-2 flex flex-col items-center gap-8">
                    <a
                        href="https://github.com/atishsharma/AT-Music-Player/releases"
                        target="_blank"
                        rel="noreferrer"
                        className="px-8 py-4 bg-surface-variant/30 hover:bg-primary text-primary hover:text-on-primary rounded-full font-black uppercase tracking-widest text-xs transition-all border border-primary/20 hover:border-transparent flex items-center gap-3 shadow-lg hover:shadow-primary/50 hover:scale-105"
                    >
                        <Sparkles size={16} />
                        Check for Updates
                    </a>

                    <div className="w-full max-w-sm text-center pt-8">
                        <a
                            href="https://github.com/atishsharma/AT-Music-Player/"
                            target="_blank"
                            rel="noreferrer"
                            className="block hover:scale-105 transition-all active:scale-95"
                        >
                            <div className="flex flex-col items-center gap-3 outline outline-1 outline-primary p-6 rounded-3xl shadow-[0_10px_30px_rgba(var(--md-sys-color-primary),0.3)] bg-surface/30 backdrop-blur-md group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[rgb(var(--md-sys-color-primary))] flex shadow-lg shadow-primary/40 items-center justify-center text-[rgb(var(--md-sys-color-on-primary))] font-black text-lg group-hover:rotate-12 transition-transform">
                                        AT
                                    </div>
                                    <h2 className="text-2xl font-black text-[rgb(var(--md-sys-color-primary))] tracking-tighter">
                                        Music Player
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2 text-on-surface-variant justify-center">
                                    <span className="text-xs font-black uppercase tracking-[0.2em] opacity-60 group-hover:text-primary transition-colors">Pro Edition</span>
                                </div>
                            </div>
                        </a>
                    </div>
                </div>
            </div>



            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 40 }}
                        className="fixed bottom-12 right-12 bg-white text-black px-8 py-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] font-black uppercase tracking-wider flex items-center gap-4 z-[200] border border-primary/20"
                    >
                        <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                        {message}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div >
    );
};

export default SettingsPage;
