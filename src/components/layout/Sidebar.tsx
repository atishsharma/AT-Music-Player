import { Home, Library, Settings, ListMusic, Heart, Download, Search, ChevronLeft, ChevronRight, History, TrendingUp, Gamepad2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useState } from 'react';

const NavItem = ({ to, icon: Icon, label, isCollapsed }: { to: string; icon: React.ElementType; label: string; isCollapsed: boolean }) => {
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
                isActive
                    ? 'text-primary'
                    : 'text-on-surface-variant hover:text-on-background',
                isCollapsed ? 'justify-center' : ''
            )}
        >
            {isActive && (
                <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-primary/10 border border-primary/10 rounded-full"
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

const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = useState(true);

    return (
        <motion.div
            initial={{ width: 256 }}
            animate={{ width: isCollapsed ? 98 : 256 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="h-full bg-surface/50 backdrop-blur-xl flex flex-col p-4 border-right overflow-hidden flex-shrink-0 outline outline-1 outline-primary z-50 shadow-lg shadow-primary/5"
        >
            <div className={clsx("flex items-center gap-4 px-2 py-8 mb-4", isCollapsed ? "justify-center" : "")}>
                <div className={clsx(
                    "flex items-center gap-3 p-1 rounded-full overflow-hidden transition-all duration-300 group",
                    !isCollapsed && "outline outline-1 outline-primary/40 px-4"
                )}>
                    <div className="w-10 h-10 rounded-full bg-[rgb(var(--md-sys-color-primary))] flex-shrink-0 flex items-center justify-center text-[rgb(var(--md-sys-color-on-primary))] font-black text-lg shadow-lg shadow-primary/40 relative z-10 group-hover:rotate-12 transition-transform overflow-hidden">
                        <img src="/app_icon.png" alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <AnimatePresence>
                        {!isCollapsed && (
                            <motion.div
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                className="text-[rgb(var(--md-sys-color-primary))] font-black text-1.8xl tracking-tighter whitespace-nowrap overflow-hidden"
                            >
                                Music Player
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

            <div className="mt-auto pt-6 border-t border-white/5 space-y-2">
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
