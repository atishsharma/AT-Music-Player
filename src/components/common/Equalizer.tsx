import { useRef, useEffect } from 'react';
import { X, Power } from 'lucide-react';
import { useEqualizerStore, EQ_BANDS, EQ_PRESETS } from '../../store/equalizerStore';
import { useThemeStore } from '../../store/themeStore';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

interface EqualizerProps {
    isOpen: boolean;
    onClose: () => void;
    anchor?: 'top' | 'bottom';
    align?: 'left' | 'right' | 'center' | 'mini';
}

const Equalizer = ({ isOpen, onClose, anchor = 'bottom', align = 'right' }: EqualizerProps) => {
    const { enabled, gains, activePreset, toggleEnabled, setGain, applyPreset } = useEqualizerStore();
    const { appearance } = useThemeStore();
    const popupRef = useRef<HTMLDivElement>(null);
    const isLight = appearance === 'light';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={popupRef}
                    initial={{ 
                        opacity: 0, 
                        y: anchor === 'bottom' ? 10 : -10, 
                        x: align === 'center' ? '-50%' : 0,
                        scale: 0.95 
                    }}
                    animate={{ 
                        opacity: 1, 
                        y: 0, 
                        x: align === 'center' ? '-50%' : 0,
                        scale: 1 
                    }}
                    exit={{ 
                        opacity: 0, 
                        y: anchor === 'bottom' ? 10 : -10, 
                        x: align === 'center' ? '-50%' : 0,
                        scale: 0.95 
                    }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className={clsx(
                        "z-[200] rounded-3xl shadow-2xl overflow-hidden border backdrop-blur-2xl",
                        align === 'mini' ? "fixed left-5 right-5 bottom-[90px] w-auto max-w-[calc(100vw-40px)]" : "absolute w-[380px] max-w-[calc(100vw-32px)]",
                        align !== 'mini' && (anchor === 'bottom' ? "bottom-full mb-4" : "top-full mt-4"),
                        align === 'right' ? "right-0" : align === 'left' ? "left-0" : align === 'center' ? "left-1/2" : "",
                        isLight
                            ? "bg-white/95 border-primary/20 shadow-primary/20"
                            : "bg-surface/95 border-white/10 shadow-black/50"
                    )}
                    style={{ WebkitAppRegion: 'no-drag' } as any}
                >
                    {/* Header */}
                    <div className={clsx(
                        "flex items-center justify-between px-5 py-3 border-b",
                        isLight ? "border-primary/10" : "border-white/5"
                    )}>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={toggleEnabled}
                                className={clsx(
                                    "p-1.5 rounded-full transition-all",
                                    enabled
                                        ? (isLight ? "text-primary bg-primary/10" : "text-primary bg-primary/20")
                                        : (isLight ? "text-gray-400" : "text-white/30")
                                )}
                                title={enabled ? "Disable EQ" : "Enable EQ"}
                            >
                                <Power size={18} />
                            </button>
                            <h3 className={clsx(
                                "text-xs font-black uppercase tracking-[0.2em]",
                                isLight ? "text-primary" : "text-primary"
                            )}>
                                Equalizer
                            </h3>
                            <span className={clsx(
                                "text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full",
                                isLight ? "bg-primary/10 text-primary" : "bg-primary/20 text-primary"
                            )}>
                                {activePreset}
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className={clsx(
                                "p-1.5 rounded-full transition-all hover:scale-110",
                                isLight ? "text-primary/60 hover:text-primary hover:bg-primary/10" : "text-white/40 hover:text-white hover:bg-white/10"
                            )}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Presets */}
                    <div className={clsx("px-5 py-3 border-b", isLight ? "border-primary/10" : "border-white/5")}>
                        <div className="flex flex-wrap gap-1.5">
                            {EQ_PRESETS.map((preset) => (
                                <button
                                    key={preset.name}
                                    onClick={() => applyPreset(preset)}
                                    className={clsx(
                                        "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all hover:scale-105",
                                        activePreset === preset.name
                                            ? (isLight
                                                ? "bg-primary text-on-primary shadow-md shadow-primary/30"
                                                : "bg-primary text-on-primary shadow-md shadow-primary/30")
                                            : (isLight
                                                ? "bg-primary/10 text-primary hover:bg-primary/20"
                                                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white")
                                    )}
                                >
                                    {preset.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sliders */}
                    <div className={clsx(
                        "px-4 py-4 transition-opacity duration-300",
                        enabled ? "opacity-100" : "opacity-30 pointer-events-none"
                    )}>
                        {/* dB labels */}
                        <div className="flex items-center justify-between mb-1">
                            <span className={clsx("text-[8px] font-bold", isLight ? "text-primary/40" : "text-white/20")}>+12dB</span>
                            <span className={clsx("text-[8px] font-bold", isLight ? "text-primary/40" : "text-white/20")}>0dB</span>
                            <span className={clsx("text-[8px] font-bold", isLight ? "text-primary/40" : "text-white/20")}>-12dB</span>
                        </div>

                        {/* Band Sliders */}
                        <div className="flex items-end justify-between gap-0.5 h-[160px] relative">
                            {/* Guide lines */}
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                {[12, 6, 0, -6, -12].map((db) => (
                                    <div key={db} className={clsx(
                                        "w-full border-t",
                                        db === 0
                                            ? (isLight ? "border-primary/30" : "border-white/20")
                                            : (isLight ? "border-primary/10" : "border-white/5")
                                    )} />
                                ))}
                            </div>

                            {EQ_BANDS.map((band, index) => {
                                const gain = gains[index];
                                const normalizedPosition = ((gain + 12) / 24) * 100;

                                return (
                                    <div key={band.frequency} className="flex flex-col items-center gap-1 flex-1 relative z-10">
                                        {/* Vertical Slider */}
                                        <div className="relative h-[140px] w-full flex flex-col items-center">
                                            <input
                                                type="range"
                                                min={-12}
                                                max={12}
                                                step={0.5}
                                                value={gain}
                                                onChange={(e) => setGain(index, parseFloat(e.target.value))}
                                                className="eq-slider-vertical"
                                                style={{
                                                    writingMode: 'vertical-lr' as any,
                                                    direction: 'rtl',
                                                    width: '140px',
                                                    height: '30px',
                                                    transform: 'rotate(0deg)',
                                                    appearance: 'none',
                                                    background: 'transparent',
                                                    cursor: 'pointer',
                                                    position: 'absolute',
                                                    opacity: 0,
                                                    zIndex: 20,
                                                    left: '50%',
                                                    marginLeft: '-15px',
                                                }}
                                            />
                                            {/* Visual bar */}
                                            <div className={clsx(
                                                "w-1.5 h-full rounded-full overflow-hidden relative",
                                                isLight ? "bg-primary/10" : "bg-white/5"
                                            )}>
                                                {/* Fill from center */}
                                                {gain >= 0 ? (
                                                    <div
                                                        className="absolute left-0 right-0 bg-primary rounded-full transition-all duration-150 ease-out"
                                                        style={{
                                                            bottom: '50%',
                                                            height: `${(gain / 12) * 50}%`
                                                        }}
                                                    />
                                                ) : (
                                                    <div
                                                        className={clsx("absolute left-0 right-0 rounded-full transition-all duration-150 ease-out",
                                                            isLight ? "bg-red-400" : "bg-red-500/80"
                                                        )}
                                                        style={{
                                                            top: '50%',
                                                            height: `${(Math.abs(gain) / 12) * 50}%`
                                                        }}
                                                    />
                                                )}
                                            </div>
                                            {/* Thumb */}
                                            <div
                                                className={clsx(
                                                    "absolute w-4 h-2.5 rounded-sm shadow-md transition-all duration-150 ease-out pointer-events-none",
                                                    isLight ? "bg-primary shadow-primary/30" : "bg-primary shadow-primary/30"
                                                )}
                                                style={{
                                                    bottom: `calc(${normalizedPosition}% - 5px)`,
                                                    left: '50%',
                                                    transform: 'translateX(-50%)'
                                                }}
                                            />
                                        </div>
                                        {/* Frequency Label */}
                                        <span className={clsx(
                                            "text-[8px] font-black tabular-nums",
                                            isLight ? "text-primary/60" : "text-white/40"
                                        )}>
                                            {band.label}
                                        </span>
                                        {/* Gain value */}
                                        <span className={clsx(
                                            "text-[7px] font-bold tabular-nums",
                                            gain > 0 ? "text-primary" : gain < 0 ? (isLight ? "text-red-400" : "text-red-500/80") : (isLight ? "text-primary/30" : "text-white/20")
                                        )}>
                                            {gain > 0 ? `+${gain}` : gain}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Equalizer;
