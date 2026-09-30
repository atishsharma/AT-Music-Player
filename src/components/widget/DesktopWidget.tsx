import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Maximize2, Pause, Pin, PinOff, Play, SkipBack, SkipForward, X, Heart, Music2 } from 'lucide-react';
import clsx from 'clsx';
import type { WidgetCommand, WidgetPlayerState } from '../../hooks/useWidgetBridge';

type WidgetStyle = 'pill' | 'card' | 'orb';

interface WidgetConfig {
    enabled: boolean;
    alwaysOnTop: boolean;
    style: WidgetStyle;
}

const EMPTY: WidgetPlayerState = {
    title: '', artist: '', album: '', artwork: '', isPlaying: false, currentTime: 0, duration: 0,
    loop: 'none', shuffle: false, isFavorite: false, appearance: 'dark', hasTrack: false, volume: 1, queue: [],
};

const send = (command: WidgetCommand) => window.ipcRenderer.send('widget:command', command);

const spring = { type: 'spring', stiffness: 500, damping: 30 } as const;

/** Playback time interpolated locally between the (1/s) state pushes, for a smooth bar. */
function useSmoothTime(state: WidgetPlayerState) {
    const [time, setTime] = useState(state.currentTime);
    const base = useRef({ at: performance.now(), time: state.currentTime });

    useEffect(() => {
        base.current = { at: performance.now(), time: state.currentTime };
        setTime(state.currentTime);
    }, [state.currentTime]);

    useEffect(() => {
        if (!state.isPlaying) return;
        const id = window.setInterval(() => {
            const elapsed = (performance.now() - base.current.at) / 1000;
            setTime(Math.min(base.current.time + elapsed, state.duration || Infinity));
        }, 250);
        return () => window.clearInterval(id);
    }, [state.isPlaying, state.duration]);

    return time;
}

const Artwork = ({ src, className, spin, playing }: { src: string; className?: string; spin?: boolean; playing?: boolean }) => (
    <div className={clsx('relative overflow-hidden bg-white/10', className)}>
        <AnimatePresence initial={false}>
            <motion.div
                key={src || 'none'}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 1.08 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
                {src ? (
                    <img
                        src={src}
                        alt=""
                        draggable={false}
                        className={clsx('w-full h-full object-cover', spin && 'widget-spin', spin && !playing && 'widget-spin-paused')}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-primary">
                        <Music2 className="text-white/80" size={22} />
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    </div>
);

const IconButton = ({ onClick, title, children, className }: { onClick: () => void; title: string; children: React.ReactNode; className?: string }) => (
    <motion.button
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.88 }}
        transition={spring}
        onClick={onClick}
        title={title}
        className={clsx('no-drag flex items-center justify-center rounded-full widget-fg-soft hover:widget-fg transition-colors', className)}
    >
        {children}
    </motion.button>
);

const PlayButton = ({ playing, size = 40 }: { playing: boolean; size?: number }) => (
    <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.9 }}
        transition={spring}
        onClick={() => send({ type: 'playPause' })}
        title={playing ? 'Pause' : 'Play'}
        className="no-drag rounded-full flex items-center justify-center widget-play shadow-lg"
        style={{ width: size, height: size }}
    >
        <AnimatePresence mode="wait" initial={false}>
            <motion.span
                key={playing ? 'pause' : 'play'}
                initial={{ scale: 0.4, opacity: 0, rotate: -45 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.4, opacity: 0, rotate: 45 }}
                transition={{ duration: 0.16 }}
                className="flex"
            >
                {playing
                    ? <Pause size={size * 0.45} fill="currentColor" />
                    : <Play size={size * 0.45} fill="currentColor" className="translate-x-[1px]" />}
            </motion.span>
        </AnimatePresence>
    </motion.button>
);

const Progress = ({ value, duration, className }: { value: number; duration: number; className?: string }) => {
    const pct = duration ? Math.min(value / duration, 1) : 0;
    const ref = useRef<HTMLDivElement>(null);
    return (
        <div
            ref={ref}
            className={clsx('no-drag relative h-1 rounded-full widget-track cursor-pointer group', className)}
            onClick={(e) => {
                if (!ref.current || !duration) return;
                const rect = ref.current.getBoundingClientRect();
                send({ type: 'seek', value: ((e.clientX - rect.left) / rect.width) * duration });
            }}
        >
            <div
                className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-primary transition-transform duration-300 ease-linear group-hover:h-1.5 group-hover:-top-[1px]"
                style={{ transform: `scaleX(${pct})` }}
            />
        </div>
    );
};

const WindowButtons = ({ config, onTogglePin }: { config: WidgetConfig; onTogglePin: () => void }) => (
    <div className="flex items-center gap-1">
        <IconButton onClick={onTogglePin} title={config.alwaysOnTop ? 'Unpin (always on top: on)' : 'Pin on top'} className="w-6 h-6">
            {config.alwaysOnTop ? <Pin size={12} className="text-primary" fill="currentColor" /> : <PinOff size={12} />}
        </IconButton>
        <IconButton onClick={() => window.ipcRenderer.invoke('widget:restore')} title="Open AT Music" className="w-6 h-6">
            <Maximize2 size={12} />
        </IconButton>
        <IconButton onClick={() => window.ipcRenderer.invoke('widget:hide')} title="Hide widget" className="w-6 h-6">
            <X size={13} />
        </IconButton>
    </div>
);

const PillWidget = ({ state, time, config, onTogglePin }: WidgetViewProps) => (
    <div className="widget-glass drag w-full h-full rounded-[28px] flex items-center gap-3 pl-3 pr-4 group">
        <Artwork src={state.artwork} className="w-[68px] h-[68px] rounded-[18px] shrink-0 shadow-lg" />
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-[13px] font-semibold truncate widget-fg">{state.title || 'Nothing playing'}</p>
                    <p className="text-[11px] truncate widget-fg-soft">{state.artist || 'AT Music Pro'}</p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <WindowButtons config={config} onTogglePin={onTogglePin} />
                </div>
            </div>
            <Progress value={time} duration={state.duration} />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
            <IconButton onClick={() => send({ type: 'prev' })} title="Previous" className="w-8 h-8"><SkipBack size={16} fill="currentColor" /></IconButton>
            <PlayButton playing={state.isPlaying} size={40} />
            <IconButton onClick={() => send({ type: 'next' })} title="Next" className="w-8 h-8"><SkipForward size={16} fill="currentColor" /></IconButton>
        </div>
    </div>
);

const formatTime = (s: number) => (!s || isNaN(s) ? '0:00' : `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`);

const CardWidget = ({ state, time, config, onTogglePin }: WidgetViewProps) => (
    <div className="widget-glass drag w-full h-full rounded-[32px] p-4 flex flex-col gap-3 group">
        <div className="relative">
            <Artwork src={state.artwork} className="w-full aspect-square rounded-[22px] shadow-xl" />
            <div className="absolute top-2 right-2 widget-chip rounded-full px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <WindowButtons config={config} onTogglePin={onTogglePin} />
            </div>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate widget-fg">{state.title || 'Nothing playing'}</p>
                <p className="text-xs truncate widget-fg-soft">{state.artist || 'AT Music Pro'}</p>
            </div>
            <IconButton onClick={() => send({ type: 'toggleFavorite' })} title="Favorite" className="w-8 h-8">
                <Heart size={16} className={state.isFavorite ? 'text-primary' : ''} fill={state.isFavorite ? 'currentColor' : 'none'} />
            </IconButton>
        </div>
        <div>
            <Progress value={time} duration={state.duration} />
            <div className="flex justify-between text-[10px] mt-1 widget-fg-soft tabular-nums">
                <span>{formatTime(time)}</span>
                <span>-{formatTime(Math.max(state.duration - time, 0))}</span>
            </div>
        </div>
        <div className="flex items-center justify-center gap-6">
            <IconButton onClick={() => send({ type: 'prev' })} title="Previous" className="w-9 h-9"><SkipBack size={20} fill="currentColor" /></IconButton>
            <PlayButton playing={state.isPlaying} size={48} />
            <IconButton onClick={() => send({ type: 'next' })} title="Next" className="w-9 h-9"><SkipForward size={20} fill="currentColor" /></IconButton>
        </div>
    </div>
);

const OrbWidget = ({ state, time, config, onTogglePin }: WidgetViewProps) => {
    const r = 92;
    const c = 2 * Math.PI * r;
    const pct = state.duration ? Math.min(time / state.duration, 1) : 0;
    return (
        <div className="drag w-full h-full relative flex items-center justify-center group">
            <svg className="absolute inset-0 -rotate-90 pointer-events-none" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r={r} className="widget-ring-track" strokeWidth="5" fill="none" />
                <circle
                    cx="100" cy="100" r={r} fill="none" strokeWidth="5" strokeLinecap="round"
                    className="stroke-primary transition-[stroke-dashoffset] duration-300 ease-linear"
                    strokeDasharray={c}
                    strokeDashoffset={c * (1 - pct)}
                />
            </svg>
            <Artwork src={state.artwork} spin playing={state.isPlaying} className="w-[164px] h-[164px] rounded-full shadow-2xl" />
            <div className="absolute w-[164px] h-[164px] rounded-full flex flex-col items-center justify-center gap-2 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-[11px] font-semibold text-white truncate max-w-[120px]">{state.title || 'Nothing playing'}</p>
                <div className="flex items-center gap-2 text-white">
                    <IconButton onClick={() => send({ type: 'prev' })} title="Previous" className="w-7 h-7 !text-white"><SkipBack size={14} fill="currentColor" /></IconButton>
                    <PlayButton playing={state.isPlaying} size={40} />
                    <IconButton onClick={() => send({ type: 'next' })} title="Next" className="w-7 h-7 !text-white"><SkipForward size={14} fill="currentColor" /></IconButton>
                </div>
                <div className="widget-chip rounded-full px-1 py-0.5 scale-90">
                    <WindowButtons config={config} onTogglePin={onTogglePin} />
                </div>
            </div>
        </div>
    );
};

interface WidgetViewProps {
    state: WidgetPlayerState;
    time: number;
    config: WidgetConfig;
    onTogglePin: () => void;
}

const DesktopWidget = () => {
    const [state, setState] = useState<WidgetPlayerState>(EMPTY);
    const [config, setConfig] = useState<WidgetConfig>({ enabled: true, alwaysOnTop: true, style: 'pill' });
    const time = useSmoothTime(state);

    useEffect(() => {
        document.documentElement.classList.add('widget-root');
        document.body.classList.add('widget-root');
        window.ipcRenderer.invoke('widget:getState').then((s) => s && setState(s));
        window.ipcRenderer.invoke('widget:getConfig').then((c) => c && setConfig(c));
        const offState = window.ipcRenderer.on('widget:state', (_e, s: WidgetPlayerState) => setState(s));
        const offConfig = window.ipcRenderer.on('widget:config', (_e, c: WidgetConfig) => setConfig(c));
        return () => { offState(); offConfig(); };
    }, []);

    const isLight = state.appearance === 'light';

    useEffect(() => {
        document.body.dataset.widgetTheme = isLight ? 'light' : 'dark';
    }, [isLight]);

    const togglePin = async () => {
        const onTop = await window.ipcRenderer.invoke('widget:setAlwaysOnTop', !config.alwaysOnTop);
        setConfig(c => ({ ...c, alwaysOnTop: onTop }));
    };

    const props = { state, time, config, onTogglePin: togglePin };

    return (
        <motion.div
            className="w-screen h-screen p-1.5 select-none"
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            onDoubleClick={() => window.ipcRenderer.invoke('widget:restore')}
        >
            {config.style === 'card' ? <CardWidget {...props} /> : config.style === 'orb' ? <OrbWidget {...props} /> : <PillWidget {...props} />}
        </motion.div>
    );
};

export default DesktopWidget;
