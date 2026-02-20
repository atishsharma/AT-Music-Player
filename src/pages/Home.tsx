
import RecentlyPlayed from '../components/home/RecentlyPlayed';
import Recommended from '../components/home/Recommended';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useThemeStore, Mood } from '../store/themeStore';
import { Smile, Zap, Target, Frown, Music, Dices, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import FidgetSpinner from '../components/home/FidgetSpinner';

const Home = () => {
    const { currentMood, setMood } = useThemeStore();
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 18) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');
    }, []);

    const moods: { type: Mood; icon: any; color: string; label: string }[] = [
        { type: 'calm', icon: Smile, color: 'bg-blue-500', label: 'Calm' },
        { type: 'energetic', icon: Zap, color: 'bg-amber-500', label: 'Energetic' },
        { type: 'focus', icon: Target, color: 'bg-green-500', label: 'Focus' },
        { type: 'sad', icon: Frown, color: 'bg-gray-500', label: 'Sad' },
        { type: 'party', icon: Music, color: 'bg-purple-500', label: 'Party' },
        { type: 'lucky', icon: Dices, color: 'bg-gradient-to-r from-pink-500 to-violet-500', label: 'Lucky' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-12 pb-8"
        >
            {/* Header / Greeting & Fidget Spinner */}
            <header className="pt-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-6xl font-black tracking-tighter text-primary mb-2">
                            {greeting}
                        </h1>
                        <p className="text-xl text-on-surface-variant font-medium tracking-tight">Ready for some music?</p>
                    </div>

                    <div className="flex items-center gap-6">
                        <a
                            href="https://github.com/atishsharma/AT-Music-Player/"
                            target="_blank"
                            rel="noreferrer"
                            className="hidden lg:flex items-center justify-center w-40 h-40 bg-surface-variant/40 backdrop-blur-xl rounded-[3rem] outline outline-1 outline-primary shadow-[0_10px_30px_rgba(var(--md-sys-color-primary),0.2)] hover:bg-surface-variant/50 transition-all group shrink-0"
                        >
                            <div className="w-[92%] h-[92%] rounded-full bg-primary/10 flex items-center justify-center overflow-hidden group-hover:rotate-12 transition-transform">
                                <img src="/app_icon.png" alt="Logo" className="w-full h-full object-cover" />
                            </div>
                        </a>
                        <FidgetSpinner />
                    </div>
                </div>
            </header>

            {/* Mood Selector */}
            <section className="space-y-6">
                <h3 className="text-sm font-black uppercase tracking-[0.3em] text-on-surface-variant px-2">How are you feeling today?</h3>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar px-2 -mx-2">
                    {moods.map((m) => (
                        <button
                            key={m.type}
                            onClick={() => {
                                if (m.type === 'lucky') {
                                    useThemeStore.getState().generateLuckyTheme();
                                } else {
                                    setMood(m.type);
                                }
                            }}
                            className={clsx(
                                "flex-shrink-0 flex items-center gap-4 px-8 py-4 rounded-[2rem] transition-all duration-300 font-black uppercase tracking-widest text-xs border border-transparent group/btn",
                                currentMood === m.type
                                    ? "bg-primary text-on-primary shadow-lg shadow-primary/30 scale-105"
                                    : "bg-surface-variant/30 text-on-surface-variant hover:bg-surface-variant/60 hover:border-white/10"
                            )}
                        >
                            <m.icon size={20} className={clsx(
                                "transition-transform group-hover/btn:rotate-12",
                                currentMood === m.type ? "text-on-primary" : "text-primary"
                            )} />
                            {m.type === 'lucky' && currentMood === 'lucky' ? (useThemeStore.getState().luckyTheme?.name || 'Feeling Lucky') : m.label}
                            {m.type === 'lucky' && <Sparkles size={14} className="ml-1 text-yellow-400 group-hover/btn:animate-pulse" />}
                        </button>
                    ))}
                </div>
            </section>

            {/* Section 1: Recently Played */}
            <section>
                <RecentlyPlayed />
            </section>

            {/* Section 2: Recommended */}
            <section>
                <Recommended />
            </section>

        </motion.div>
    );
};

export default Home;
