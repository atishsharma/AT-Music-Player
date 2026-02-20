import { motion, useAnimation } from 'framer-motion';
import { Volume2, VolumeX, Radio } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

const SettingSpinner = () => {
    const controls = useAnimation();
    const [isSpinning, setIsSpinning] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);

    const playTechSound = () => {
        if (!soundEnabled) return;

        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();

            // Complex tech sound: Filtered noise + sweeping sine
            const now = ctx.currentTime;

            // Oscillator sweep
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.type = 'sawtooth';
            filter.type = 'lowpass';

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.frequency.setValueAtTime(60, now);
            osc.frequency.exponentialRampToValueAtTime(440, now + 0.5);
            osc.frequency.exponentialRampToValueAtTime(80, now + 4);

            filter.frequency.setValueAtTime(200, now);
            filter.frequency.exponentialRampToValueAtTime(2000, now + 1);
            filter.Q.value = 15;

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 4);

            osc.start();
            osc.stop(now + 4);

            // Subtle sub thud
            const sub = ctx.createOscillator();
            const subGain = ctx.createGain();
            sub.connect(subGain);
            subGain.connect(ctx.destination);
            sub.frequency.setValueAtTime(100, now);
            sub.frequency.exponentialRampToValueAtTime(40, now + 0.2);
            subGain.gain.setValueAtTime(0.5, now);
            subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            sub.start();
            sub.stop(now + 0.2);

        } catch (e) {
            console.error("Audio error", e);
        }
    };

    const handleAction = async () => {
        if (isSpinning) return;
        setIsSpinning(true);
        playTechSound();

        // Complex animation: Rotate + Pulse + Scale
        await controls.start({
            rotate: [0, 1080],
            scale: [1, 1.2, 1],
            transition: {
                duration: 4,
                ease: [0.6, 0.01, 0.05, 0.95]
            }
        });

        setIsSpinning(false);
    };

    return (
        <div
            className="flex items-center gap-4 bg-surface-variant/20 backdrop-blur-xl p-3 pr-6 rounded-full border border-primary/20 shadow-lg hover:bg-surface-variant/30 transition-all cursor-pointer group relative overflow-hidden"
            onClick={handleAction}
        >
            <div className="relative w-12 h-12 flex items-center justify-center">
                {/* Sonic Rings */}
                {[...Array(3)].map((_, i) => (
                    <motion.div
                        key={i}
                        animate={controls}
                        className={clsx(
                            "absolute rounded-full border-2 border-primary/40",
                            i === 0 ? "w-12 h-12" : i === 1 ? "w-8 h-8" : "w-4 h-4"
                        )}
                        style={{
                            borderStyle: i % 2 === 0 ? 'solid' : 'dashed'
                        }}
                        transition={{
                            rotate: {
                                duration: 4,
                                ease: "easeInOut",
                                repeat: isSpinning ? 0 : Infinity,
                                repeatType: "loop"
                            }
                        }}
                    />
                ))}

                {/* Pulse Glow */}
                {isSpinning && (
                    <motion.div
                        initial={{ scale: 0.5, opacity: 1 }}
                        animate={{ scale: 3, opacity: 0 }}
                        transition={{ duration: 1, repeat: 4 }}
                        className="absolute inset-0 bg-primary/20 rounded-full"
                    />
                )}

                <Radio className={clsx("relative z-10 transition-colors", isSpinning ? "text-primary" : "text-primary/60")} size={20} />
            </div>

            <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Core Status</span>
                <span className="text-sm font-black text-on-surface leading-tight">Sonic Pulsar</span>
            </div>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setSoundEnabled(!soundEnabled);
                }}
                className={clsx(
                    "ml-2 p-2 rounded-full transition-all",
                    soundEnabled ? "bg-primary/10 text-primary" : "bg-red-500/10 text-red-500"
                )}
            >
                {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
        </div>
    );
};

export default SettingSpinner;
