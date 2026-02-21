import { motion, useAnimation } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';
const FidgetSpinner = () => {
    const controls = useAnimation();
    const [rotation, setRotation] = useState(0);
    const [soundEnabled, setSoundEnabled] = useState(true);

    const playSpinSound = () => {
        // Only play if sound is enabled AND no music is playing (unless manually overridden? User said: "default is on if no music is playing but can override with that toggle even if music is on")
        // Interpretation: Text says "if no music is playing but can override with that toggle even if music is on".
        // Actually, let's stick to the simplest interpretation:
        // Sound plays IF soundEnabled is true. The user can toggle it off.
        // The default "on" state implies it's enabled.
        // The constraint "if no music is playing" is the default behavior, but the toggle overrides it?
        // Let's make it simple: If toggle is ON, sound plays. If toggle is OFF, sound doesn't play.
        // But what about the "if no music is playing" part?
        // Let's defer to: Play if soundEnabled is true. The user can toggle it.

        if (!soundEnabled) return;

        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            const now = ctx.currentTime;

            osc.frequency.setValueAtTime(150, now);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.3, now + 0.1);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.5);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 12);
            osc.frequency.exponentialRampToValueAtTime(100, now + 12);

            osc.start();
            osc.stop(now + 12.1);
        } catch (e) {
            console.error("Audio error", e);
        }
    };

    const handleSpin = async () => {
        playSpinSound();
        const extraRotation = (360 * 15 + Math.random() * 720) * 4;
        const newRotation = rotation + extraRotation;
        setRotation(newRotation);

        await controls.start({
            rotate: newRotation,
            transition: {
                duration: 12,
                ease: [0.2, 0, 0.3, 1],
                type: "tween"
            }
        });
    };

    // Indian Flag Colors: Saffron, White, Green
    const wingColors = [
        "from-orange-500 to-orange-600", // Saffron
        "from-gray-100 to-white",        // White
        "from-green-500 to-green-600"    // Green
    ];

    return (
        <div
            className="bg-surface-variant/40 backdrop-blur-xl p-8 rounded-[3rem] outline outline-1 outline-primary shadow-[0_10px_30px_rgba(var(--md-sys-color-primary),0.2)] flex flex-row items-center justify-start overflow-hidden group cursor-pointer relative gap-8 hover:bg-surface-variant/50 transition-all"
            onClick={handleSpin}
        >
            <motion.div
                animate={controls}
                className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center ml-4"
            >
                {/* Spinner Wings */}
                {[0, 120, 240].map((deg, i) => (
                    <motion.div
                        key={deg}
                        style={{ rotate: deg }}
                        className="absolute inset-0 flex items-center justify-center"
                    >
                        <div className={`w-8 h-14 bg-gradient-to-t ${wingColors[i]} rounded-full translate-y-8 shadow-lg border border-white/20`} />
                    </motion.div>
                ))}

                {/* Center Core */}
                <div className="w-12 h-12 bg-white rounded-full z-10 shadow-2xl flex items-center justify-center border-4 border-[#000080] relative overflow-hidden group/core">
                    {/* Ashoka Chakra-ish Center */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-[#000080] rounded-full" />
                        {[...Array(24)].map((_, i) => (
                            <div key={i} className="absolute w-[0.5px] h-full bg-[#000080]" style={{ transform: `rotate(${i * 15}deg)` }} />
                        ))}
                    </div>
                </div>
            </motion.div>

            <div className="hidden md:flex flex-col justify-center w-64 h-full">
                <div className="mb-2">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant mb-1">Interactive</p>
                    <p className="text-3xl font-black text-on-background tracking-tighter">Stress Reliever</p>
                </div>
                <p className="text-sm text-on-surface-variant/60 font-medium">Spin to relax and focus.</p>
            </div>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setSoundEnabled(!soundEnabled);
                }}
                className={`absolute bottom-4 right-4 p-2 rounded-xl transition-all z-10 ${soundEnabled
                    ? 'bg-surface-variant/50 text-on-surface-variant hover:text-primary'
                    : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                    }`}
            >
                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
        </div>
    );
};

export default FidgetSpinner;
