
import RecentlyPlayed from '../components/home/RecentlyPlayed';
import Recommended from '../components/home/Recommended';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useThemeStore, Mood } from '../store/themeStore';
import { MUSIC_QUOTES } from '../constants/quotes';
import { Smile, Zap, Target, Frown, Music, Dices, Sparkles, RefreshCw, Quote } from 'lucide-react';
import clsx from 'clsx';
import FidgetSpinner from '../components/home/FidgetSpinner';
import { useSettingsStore } from '../store/settingsStore';
import Trending from '../components/home/Trending';

const QuoteSection = () => {
    const [currentQuote, setCurrentQuote] = useState({ text: '', author: '' });
    const [isRefreshing, setIsRefreshing] = useState(false);

    const getRandomQuote = () => {
        setIsRefreshing(true);
        const randomIndex = Math.floor(Math.random() * MUSIC_QUOTES.length);
        setCurrentQuote(MUSIC_QUOTES[randomIndex]);
        setTimeout(() => setIsRefreshing(false), 500); // Visual feedback
    };

    useEffect(() => {
        getRandomQuote();
    }, []);

    return (
        <div className="relative h-full flex flex-col justify-center">
            <div className="absolute top-0 left-0 text-primary opacity-4 -translate-x-1 -translate-y-3">
                <Quote size={20} />
            </div>

            <div className="space-y-2 relative z-2">
                <p className={clsx(
                    "text-s font-semibold italic leading-relaxed text-on-surface line-clamp-3 transition-all duration-300",
                    isRefreshing ? "opacity-40 blur-sm" : "opacity-100 blur-0"
                )}>
                    "{currentQuote.text}"
                </p>

                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60 italic line-clamp-1 block">
                    — {currentQuote.author}
                </span>
            </div>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    getRandomQuote();
                }}
                disabled={isRefreshing}
                className="absolute bottom-0 right-0 p-1 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-on-primary transition-all active:scale-90 disabled:opacity-50 z-10"
                title="New Quote"
            >
                <RefreshCw size={19} className={clsx(isRefreshing && "animate-spin")} />
            </button>
        </div>
    );
};

const Home = () => {
    const { currentMood, setMood } = useThemeStore();
    const { youtubeApiKey } = useSettingsStore();
    const [greeting, setGreeting] = useState('');
    const [_accentColor] = useState(() => {
        const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#FF8A5C', '#D4A5FF', '#5CE1E6', '#FF6F91', '#67E8F9', '#FCA5A5'];
        return colors[Math.floor(Math.random() * colors.length)];
    });

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

    const moodTaglines: Record<string, string> = {
        calm: 'Breathe deep, let the music flow',
        energetic: 'Turn it up, feel the energy!',
        focus: 'Lock in, zero distractions',
        sad: 'It\'s okay, music understands you',
        party: 'Let\'s get this party started!',
        lucky: 'Feeling adventurous today?',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-12 pb-8"
        >
            {/* Header / Greeting & Dashboard Section */}
            <header className="pt-8">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="pt-4 drop-shadow-2xl">
                        <h1
                            className="text-8xl font-black tracking-tighter mb-1 italic"
                            style={{
                                color: 'var(--md-sys-color-primary)',
                                outlineColor: '#b60909ff',
                                outlineWidth: '1px',
                                textShadow: '0 0 8px var(--md-sys-color-primary)',
                                paintOrder: 'stroke fill',
                            }}
                        >
                            {greeting}
                        </h1>
                        <motion.p
                            className="mt-1 inline-block text-[11px] text-primary font-black tracking-widest uppercase px-3 py-1 rounded-xl border border-primary/40 bg-primary/5 cursor-default select-none"
                            style={{
                                textShadow: '0 0 8px var(--md-sys-color-primary)'
                            }}
                            whileHover={{
                                rotate: [0, -3, 3, -2, 2, 0],
                                scale: [1, 1.05, 1.05, 1.05, 1.05, 1],
                                transition: { duration: 0.5 }
                            }}
                        >
                            {moodTaglines[currentMood] || 'Ready for some music?'}
                        </motion.p>
                    </div>

                    <div className="flex items-center gap-6">
                        <a
                            href="https://github.com/atishsharma/AT-Music-Player/"
                            target="_blank"
                            rel="noreferrer"
                            className="hidden lg:flex items-center justify-center w-40 h-40 bg-surface-variant/40 backdrop-blur-xl rounded-[3rem] outline outline-1 outline-primary shadow-[0_10px_30px_rgba(var(--md-sys-color-primary),0.2)] hover:bg-surface-variant/50 transition-all group shrink-0"
                        >
                            <div className="w-[92%] h-[92%] rounded-full bg-primary/10 flex items-center justify-center overflow-hidden group-hover:rotate-12 transition-transform">
                                <img src="./app_icon.png" alt="Logo" className="w-full h-full object-cover" />
                            </div>
                        </a>

                        {/* Quote Block - Now symmetric with Logo and Spinner */}
                        <div className="hidden xl:block w-72 h-40 bg-primary/5 backdrop-blur-2xl border border-primary/20 rounded-[3rem] p-6 shadow-2xl shadow-primary/5 relative group overflow-hidden shrink-0">
                            <QuoteSection />
                        </div>

                        <FidgetSpinner />
                    </div>
                </div>
            </header>

            {/* Mood Selector */}
            <section className="space-y-6">
                <h3 className="text-xl font-black tracking-widest italic px-2"
                    style={{
                        color: 'var(--md-sys-color-primary)',
                        paintOrder: 'stroke fill',
                    }}
                >
                    How Are You Feeling Today?
                </h3>
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

            {/* Section 1: Trending (Only with API Key) */}
            {youtubeApiKey && (
                <section>
                    <Trending />
                </section>
            )}

            {/* Section 2: Recently Played */}
            <section>
                <RecentlyPlayed />
            </section>

            {/* Section 3: Recommended (Only with API Key) */}
            {youtubeApiKey && (
                <section>
                    <Recommended />
                </section>
            )}

        </motion.div>
    );
};

export default Home;
