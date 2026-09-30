import { Home, Library, Settings, ListMusic, Heart, Download, Search, ChevronLeft, ChevronRight, History, TrendingUp, Gamepad2, Sun, Moon, Zap, Droplets } from 'lucide-react';
import type { Appearance } from '../../store/themeStore';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useState } from 'react';
import { useThemeStore } from '../../store/themeStore';

const NavItem = ({ to, icon: Icon, label, isCollapsed }: { to: string; icon: React.ElementType; label: string; isCollapsed: boolean }) => {
    const liquidGlass = useThemeStore(s => s.liquidGlass);
    const location = useLocation();
    const navigate = useNavigate();
    const isActive = location.pathname === to;

    return (
        <div
            onClick={() => {
                if (isActive) {
                    navigate(-1);
                } else {
                    navigate(to);
                }
            }}
            className={clsx(
                'flex items-center gap-3 px-3 py-3 rounded-full transition-all duration-300 font-medium relative group cursor-pointer',
                liquidGlass && 'lg-press',
                isActive
                    ? 'text-primary'
                    : 'text-on-surface-variant hover:text-on-background',
                isCollapsed ? 'justify-center' : ''
            )}
        >
            {isActive && (
                <motion.div
                    layoutId="nav-pill"
                    className={clsx("absolute inset-0 rounded-full", liquidGlass ? "lg-active" : "bg-primary/10 border border-primary/10")}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
            )}
            <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className="relative z-10 flex-shrink-0" />
            <AnimatePresence mode="wait">
                {!isCollapsed && (
                    <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="relative z-10 whitespace-nowrap overflow-hidden"
                    >
                        {label}
                    </motion.span>
                )}
            </AnimatePresence>
        </div>
    );
};

const THEMES: { id: Appearance; label: string; icon: React.ElementType }[] = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'oled', label: 'OLED', icon: Zap },
    { id: 'glass', label: 'Glass', icon: Droplets },
];

/** Quick theme switch: a segmented row when the sidebar is open, one cycling button when collapsed. */
const ThemeSwitch = ({ isCollapsed }: { isCollapsed: boolean }) => {
    const appearance = useThemeStore(s => s.appearance);
    const setAppearance = useThemeStore(s => s.setAppearance);
    const liquidGlass = useThemeStore(s => s.liquidGlass);
    const current = THEMES.find(t => t.id === appearance) ?? THEMES[1];

    if (isCollapsed) {
        const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
        const Icon = current.icon;
        return (
            <button
                onClick={() => setAppearance(next.id)}
                title={`Theme: ${current.label} (click for ${next.label})`}
                className="w-full flex items-center justify-center p-3 rounded-full text-on-surface-variant hover:text-on-background hover:bg-on-background/[0.06] transition-colors lg-press"
            >
                <motion.span key={current.id} initial={{ rotate: -90, scale: 0.6, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 22 }} className="flex">
                    <Icon size={20} />
                </motion.span>
            </button>
        );
    }

    return (
        <div className="px-1" role="group" aria-label="Theme">
            <div className={clsx("grid grid-cols-4 gap-1 p-1 rounded-full", liquidGlass ? "bg-on-background/[0.06]" : "bg-on-background/[0.05] border border-on-background/[0.06]")}>
                {THEMES.map(t => {
                    const active = t.id === appearance;
                    const Icon = t.icon;
                    return (
                        <button
                            key={t.id}
                            onClick={() => setAppearance(t.id)}
                            title={t.label}
                            aria-pressed={active}
                            className={clsx(
                                "relative flex items-center justify-center h-8 rounded-full transition-colors",
                                active ? "text-on-background" : "text-on-surface-variant hover:text-on-background"
                            )}
                        >
                            {active && (
                                <motion.span
                                    layoutId="theme-pill"
                                    className={clsx("absolute inset-0 rounded-full", liquidGlass ? "lg-active" : "bg-background shadow-sm")}
                                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                                />
                            )}
                            <Icon size={15} className="relative z-10" />
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const liquidGlass = useThemeStore(s => s.liquidGlass);

    return (
        <motion.div
            initial={{ width: 256 }}
            animate={{ width: isCollapsed ? 98 : 256 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={clsx(
                "flex flex-col p-4 overflow-hidden flex-shrink-0 z-50",
                liquidGlass
                    // Floating glass panel under the title bar
                    ? "lg-panel lg-sheen rounded-[28px] mt-[44px] mb-3 h-[calc(100%-56px)] pt-2"
                    : "h-full bg-surface/50 backdrop-blur-xl pt-[40px] border-r border-primary/60 shadow-lg shadow-primary/5"
            )}
        >
            <div className={clsx("flex items-center gap-4 px-2 mb-4", liquidGlass ? "py-5" : "py-8", isCollapsed ? "justify-center" : "")}>
                <div className={clsx(
                    "flex items-center gap-3 p-1 rounded-full overflow-hidden transition-all duration-300 group",
                    !isCollapsed && "outline outline-1 outline-primary/40 px-4"
                )}>
                    <div className="w-10 h-10 rounded-full bg-[rgb(var(--md-sys-color-primary))] flex-shrink-0 flex items-center justify-center text-[rgb(var(--md-sys-color-on-primary))] font-black text-lg shadow-lg shadow-primary/40 relative z-10 group-hover:rotate-12 transition-transform overflow-hidden">
                        <img src="./app_icon.png" alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <AnimatePresence>
                        {!isCollapsed && (
                            <motion.div
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                className="text-[rgb(var(--md-sys-color-primary))] font-black text-1.8xl tracking-tighter whitespace-nowrap overflow-hidden"
                            >
                                Music Pro
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <nav className="flex-1 space-y-2">
                <NavItem to="/" icon={Home} label="Home" isCollapsed={isCollapsed} />
                <NavItem to="/search" icon={Search} label="Search" isCollapsed={isCollapsed} />
                <NavItem to="/downloads" icon={Download} label="Downloads" isCollapsed={isCollapsed} />
                <NavItem to="/library" icon={Library} label="Library" isCollapsed={isCollapsed} />
                <NavItem to="/playlists" icon={ListMusic} label="Playlists" isCollapsed={isCollapsed} />
                <NavItem to="/favorites" icon={Heart} label="Favorites" isCollapsed={isCollapsed} />
                <NavItem to="/favorites/history" icon={History} label="History" isCollapsed={isCollapsed} />
                <NavItem to="/lastfm" icon={TrendingUp} label="Last.FM" isCollapsed={isCollapsed} />
                <NavItem to="/fun" icon={Gamepad2} label="Fun Zone" isCollapsed={isCollapsed} />
            </nav>

            <div className="mt-auto pt-4 border-t border-on-background/[0.08] space-y-2">
                <ThemeSwitch isCollapsed={isCollapsed} />
                <div className="relative flex items-center">
                    <div className="flex-1 space-y-2">
                        <NavItem to="/settings" icon={Settings} label="Settings" isCollapsed={isCollapsed} />
                    </div>
                    {!isCollapsed && (
                        <button
                            onClick={() => setIsCollapsed(true)}
                            className="absolute right-2 p-1.5 rounded-full hover:bg-white/10 text-on-surface-variant transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                    )}
                </div>
                {isCollapsed && (
                    <button
                        onClick={() => setIsCollapsed(false)}
                        className="w-full flex items-center justify-center p-2 rounded-full hover:bg-white/10 text-on-surface-variant transition-colors"
                    >
                        <ChevronRight size={16} />
                    </button>
                )}
            </div>
        </motion.div >
    );
};

export default Sidebar;
