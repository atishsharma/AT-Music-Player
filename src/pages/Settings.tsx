import { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useThemeStore } from '../store/themeStore';
import { Globe, Sparkles, ShieldCheck, Sun, Moon, Zap, FolderPlus, Monitor, Music, Terminal, Code2, Cpu, Atom, Box, Wind } from 'lucide-react';
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

    const { currentMood, appearance, setAppearance, luckyTheme, generateLuckyTheme, setMood, zoomLevel, setZoomLevel } = useThemeStore();

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

            {/* Layout Scaler (Detached Single Row) */}
            <div className="lg:col-span-2 flex flex-col md:flex-row items-center gap-6 py-4 px-2 mb-6 border-b border-white/5 pb-8 -mt-[20px]">
                <div className="flex items-center gap-3 whitespace-nowrap min-w-[150px]">
                    <Monitor className="text-primary" size={24} />
                    <h2 className="text-xl font-black text-on-surface tracking-tight">Layout Scaler</h2>
                </div>

                <div className="flex-1 w-full relative h-[3.5rem] flex items-center group cursor-pointer px-4">
                    {/* Bar */}
                    <div className="absolute inset-x-4 flex items-center">
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden relative shadow-inner">
                            <div
                                className="absolute left-0 h-full bg-primary transition-all duration-300 ease-out"
                                style={{ width: `${([0.9, 1, 1.1, 1.25, 1.5].indexOf(zoomLevel || 1) / 4) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* 5 Steps Names and marks */}
                    <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none z-10">
                        {[0.9, 1, 1.1, 1.25, 1.5].map((val, idx) => {
                            const names = ["Tiny", "Normal", "Large", "Huge", "Max"];
                            const isDefault = val === 1;
                            const isSelected = zoomLevel === val;
                            return (
                                <div key={val} className="flex flex-col items-center relative w-0">
                                    <div className={clsx(
                                        "w-2.5 h-2.5 rounded-full transition-all duration-300 z-10",
                                        isSelected ? "bg-primary shadow-[0_0_15px_rgba(var(--md-sys-color-primary),0.8)] scale-[3]" : "bg-white/30"
                                    )} />
                                    <div className="absolute top-5 flex flex-col items-center">
                                        <span className={clsx(
                                            "text-[10px] uppercase tracking-widest font-black transition-colors whitespace-nowrap",
                                            isSelected ? "text-primary" : "text-on-surface-variant/50"
                                        )}>{names[idx]}</span>
                                        {isDefault && <span className="text-[8px] font-bold text-primary opacity-80 uppercase leading-none mt-0.5">(Default)</span>}
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
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 hover:cursor-grab active:cursor-grabbing"
                    />
                </div>

                <div className="whitespace-nowrap px-4 w-24 flex justify-end">
                    <span className="text-2xl font-black tracking-widest text-primary">{Math.round((zoomLevel || 1) * 100)}%</span>
                </div>
            </div>

            {/* Download Location Section (Detached Full Width Single Line) */}
            <div className="lg:col-span-2 bg-surface-variant/20 backdrop-blur-xl rounded-[3rem] p-8 border border-white/5 space-y-0 hover:bg-surface-variant/30 transition-all flex flex-col md:flex-row md:items-center gap-6 justify-between mt-8">
                <div className="flex items-center gap-4 whitespace-nowrap">
                    <div className="p-4 bg-primary/10 rounded-[1.5rem]">
                        <FolderPlus className="text-primary" size={24} />
                    </div>
                    <h2 className="text-2xl font-black text-on-surface">Download Location</h2>
                </div>
                <div className="flex-1 flex flex-col md:flex-row md:items-center gap-4 w-full">
                    <div className="flex-1 w-full bg-surface-variant/5 border border-outline/10 rounded-[1.5rem] px-6 py-4 text-sm text-on-surface font-mono overflow-hidden whitespace-nowrap flex items-center h-[56px] min-h-[56px]">
                        <span className="truncate w-full block">
                            {downloadPath || 'Default: App Data Folder'}
                        </span>
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
                        className="px-8 bg-primary text-on-primary rounded-[1.5rem] font-black uppercase tracking-widest text-xs transition-all hover:scale-105 shadow-lg whitespace-nowrap h-[56px] min-h-[56px] flex items-center justify-center"
                    >
                        Change Folder
                    </button>
                </div>
            </div>

            {/* Primary Color & Appearance Section (Combined) */}
            <div className="lg:col-span-2 bg-surface-variant/20 backdrop-blur-xl rounded-[3rem] p-10 border border-outline/10 space-y-8 hover:bg-surface-variant/30 transition-all mt-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-primary/10 rounded-[1.5rem]">
                            <Sparkles className="text-primary" size={24} />
                        </div>
                        <h2 className="text-2xl font-black text-on-surface">Theme & Appearance</h2>
                    </div>

                    {/* Compact Appearance Toggle as 3 Circles */}
                    <div className="flex items-center gap-3 bg-surface-variant/30 p-2 rounded-full border border-white/5 outline outline-1 outline-primary">
                        {(['light', 'dark', 'oled'] as const).map((a) => {
                            const isLucky = currentMood === 'lucky';
                            const isDisabled = isLucky && a === 'light';
                            return (
                                <button
                                    key={a}
                                    disabled={isDisabled}
                                    onClick={() => setAppearance(a)}
                                    title={isDisabled ? "Not available in Lucky" : `Switch to ${a} mode`}
                                    className={clsx(
                                        "flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 border-2",
                                        appearance === a
                                            ? "bg-primary text-on-primary border-transparent shadow-lg scale-105"
                                            : "text-on-surface-variant border-transparent hover:bg-surface-variant/50 hover:text-on-surface",
                                        isDisabled && "opacity-20 cursor-not-allowed grayscale"
                                    )}
                                >
                                    {a === 'light' && <Sun size={20} />}
                                    {a === 'dark' && <Moon size={20} />}
                                    {a === 'oled' && <Zap size={20} />}
                                </button>
                            );
                        })}
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
                                if (m.type === 'lucky') {
                                    generateLuckyTheme();
                                } else {
                                    setMood(m.type as any);
                                }
                            }}
                            className={clsx(
                                "flex items-center gap-3 px-6 py-4 rounded-[1.5rem] transition-all duration-300 font-bold border border-transparent shadow-sm hover:shadow-md",
                                currentMood === m.type
                                    ? "bg-primary text-on-primary scale-105 border-white/20"
                                    : "bg-surface-variant/50 text-on-surface-variant hover:bg-surface-variant"
                            )}
                        >
                            <div className="w-5 h-5 rounded-full shadow-inner border border-white/10" style={{ background: m.color }} />
                            {m.type === 'lucky' && currentMood === 'lucky' && luckyTheme
                                ? luckyTheme.name
                                : m.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* YouTube & Last.fm Row */}
            <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
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
                            <div className="rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center p-2.5">
                                <img src="/last-fm.png" alt="Last.fm API" className="h-8 object-contain" />
                            </div>
                            <h2 className="text-2xl font-black text-on-surface">Last.fm Engine</h2>
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



            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">

                <div className="bg-surface-variant/20 backdrop-blur-xl rounded-[3rem] p-10 border border-white/5 flex flex-col justify-center items-start gap-4 hover:bg-surface-variant/30 transition-all group overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/30 transition-all" />

                    <h3 className="text-sm font-black uppercase tracking-[0.3em] text-on-surface-variant/60">Credits</h3>
                    <div className="w-full flex items-center justify-between gap-4">
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
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                            <a href="https://atishaksharma.com" target="_blank" rel="noreferrer" className="block relative z-10 hover:scale-105 transition-transform duration-300">
                                <img
                                    src="/ats-logo.png"
                                    alt="Atish Ak Sharma logo"
                                    className="w-[144px] h-[144px] rounded-full shadow-2xl object-cover bg-white p-2"
                                />
                            </a>
                        </div>
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

                {/* Technology Credits Row */}
                <div className="lg:col-span-2 bg-surface-variant/10 backdrop-blur-xl rounded-[3rem] p-10 border border-white/5 space-y-8 hover:bg-surface-variant/20 transition-all mt-8">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-primary/10 rounded-[1.5rem]">
                            <Sparkles className="text-primary" size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-on-surface-variant/60">Core Backbone</h3>
                            <h2 className="text-2xl font-black text-on-surface">Powered by Open Source Projects & Free API</h2>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        {[
                            { name: 'LRCLib', url: 'https://lrclib.net', color: 'hover:bg-blue-500/20 border-blue-500/20', icon: Music },
                            { name: 'yt-dlp', url: 'https://github.com/yt-dlp/yt-dlp', color: 'hover:bg-red-500/20 border-red-500/20', icon: Terminal },
                            { name: 'Last.fm', url: 'https://www.last.fm', color: 'hover:bg-red-600/20 border-red-600/20', icon: Music },
                            { name: 'MusicBrainz', url: 'https://musicbrainz.org', color: 'hover:bg-purple-500/20 border-purple-500/20', icon: Globe },
                            { name: 'Node.js', url: 'https://nodejs.org', color: 'hover:bg-green-500/20 border-green-500/20', icon: Cpu },
                            { name: 'TypeScript', url: 'https://www.typescriptlang.org', color: 'hover:bg-blue-600/20 border-blue-600/20', icon: Code2 },
                            { name: 'React', url: 'https://react.dev', color: 'hover:bg-cyan-500/20 border-cyan-500/20', icon: Atom },
                            { name: 'Vite', url: 'https://vitejs.dev', color: 'hover:bg-yellow-500/20 border-yellow-500/20', icon: Zap },
                            { name: 'Electron', url: 'https://electronjs.org', color: 'hover:bg-sky-400/20 border-sky-400/20', icon: Box },
                            { name: 'FFmpeg', url: 'https://ffmpeg.org', color: 'hover:bg-green-600/20 border-green-600/20', icon: Terminal },
                            { name: 'Tailwind CSS', url: 'https://tailwindcss.com', color: 'hover:bg-cyan-400/20 border-cyan-400/20', icon: Wind },
                        ].map((tech) => (
                            <a
                                key={tech.name}
                                href={tech.url}
                                target="_blank"
                                rel="noreferrer"
                                className={clsx(
                                    "px-6 py-4 rounded-2xl bg-surface-variant/10 border transition-all hover:scale-110 active:scale-95 shadow-xl backdrop-blur-md group relative overflow-hidden",
                                    tech.color
                                )}
                            >
                                <div className="relative z-10 flex items-center gap-3">
                                    <tech.icon size={18} className="text-on-surface-variant group-hover:text-primary transition-colors" />
                                    <span className="text-on-surface font-black tracking-widest text-xs uppercase group-hover:text-primary transition-colors">
                                        {tech.name}
                                    </span>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                        ))}
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
