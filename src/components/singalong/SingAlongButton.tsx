import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MicVocal, Maximize } from 'lucide-react';
import clsx from 'clsx';
import { useAudioStore } from '../../store/audioStore';
import { openKaraoke } from './karaoke';
import { useThemeStore } from '../../store/themeStore';

/** Player-bar button: vocal-reduction slider + karaoke view */
const SingAlongButton = ({ isLight }: { isLight: boolean }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const amount = useAudioStore(s => s.vocalReduction);
    const setAudio = useAudioStore(s => s.set);
    const liquidGlass = useThemeStore(s => s.liquidGlass);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(o => !o)}
                className={clsx(
                    "p-2 rounded-full transition-all hover:scale-110",
                    open || amount > 0
                        ? (isLight ? "bg-white text-primary" : "bg-primary text-on-primary")
                        : (isLight ? "text-on-primary/70 hover:bg-black/5" : "text-on-surface-variant hover:bg-white/5")
                )}
                title="Sing-along"
            >
                <MicVocal size={18} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={clsx(
                            "absolute bottom-full mb-4 right-0 z-[200] w-[300px] rounded-3xl p-5 shadow-2xl border",
                            liquidGlass ? "lg-panel lg-strong lg-blur text-on-background" : "bg-background/95 backdrop-blur-2xl border-on-background/10 text-on-background shadow-black/30"
                        )}
                        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[14px] font-semibold">Sing-along</span>
                            <span className="font-mono text-[12px] text-on-background/60 tabular-nums">{amount === 0 ? 'Off' : `${Math.round(amount * 100)}%`}</span>
                        </div>
                        <p className="text-[12px] text-on-background/55 mb-3">Turns down the lead vocals so you can sing over the music. Works best on studio mixes.</p>
                        <input
                            type="range" min={0} max={1} step={0.05} value={amount}
                            onChange={e => setAudio({ vocalReduction: parseFloat(e.target.value) })}
                            aria-label="Vocal reduction"
                            className="w-full accent-[rgb(var(--md-sys-color-primary))]"
                        />
                        <div className="flex justify-between text-[11px] text-on-background/45 mb-4"><span>Original</span><span>Vocals down</span></div>
                        <button
                            onClick={() => { setOpen(false); openKaraoke(); }}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-primary text-on-primary text-[13px] font-semibold hover:brightness-110 transition"
                        >
                            <Maximize size={15} /> Karaoke view
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SingAlongButton;
