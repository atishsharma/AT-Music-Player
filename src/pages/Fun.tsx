import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Gamepad2, MousePointerClick, Zap, Palette, Wind, Quote, Droplet, Hash, Grip, Maximize, Orbit, X, Hand, Keyboard, ChevronLeft, ChevronRight } from 'lucide-react';

// Activity 1: Bubble Wrap
const BubbleWrap = () => {
    const [bubbles, setBubbles] = useState(Array(30).fill(false));
    const pop = (index: number) => {
        if (bubbles[index]) return;
        setBubbles(prev => {
            const next = [...prev];
            next[index] = true;
            return next;
        });
    };
    return (
        <div className="flex flex-col items-center gap-4 w-full h-full p-4 overflow-y-auto no-scrollbar">
            <h3 className="text-xl font-black text-on-surface">Bubble Wrap</h3>
            <p className="text-on-surface-variant text-sm">Pop them all!</p>
            <div className="grid grid-cols-5 md:grid-cols-6 gap-3">
                {bubbles.map((isPopped, i) => (
                    <motion.div
                        key={i}
                        whileHover={{ scale: isPopped ? 1 : 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => pop(i)}
                        className={clsx(
                            "w-12 h-12 rounded-full cursor-pointer flex items-center justify-center transition-colors shadow-inner",
                            isPopped ? "bg-surface/10 border-none" : "bg-primary/40 border border-primary glow hover:bg-primary/60"
                        )}
                    >
                        {isPopped && <div className="w-2 h-2 rounded-full bg-white/20" />}
                    </motion.div>
                ))}
            </div>
            {bubbles.every(b => b) && (
                <button onClick={() => setBubbles(Array(30).fill(false))} className="mt-4 px-6 py-2 bg-primary text-on-primary rounded-full font-bold">Refill</button>
            )}
        </div>
    );
};

// Activity 2: Zen Breathing
const ZenBreathing = () => {
    const [phase, setPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');

    useEffect(() => {
        const interval = setInterval(() => {
            setPhase(p => {
                if (p === 'Inhale') return 'Hold';
                if (p === 'Hold') return 'Exhale';
                return 'Inhale';
            });
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center w-full h-full p-4 gap-8">
            <h3 className="text-xl font-black text-on-surface">Zen Focus</h3>
            <div className="relative w-48 h-48 flex items-center justify-center">
                <motion.div
                    animate={{
                        scale: phase === 'Inhale' ? 1.5 : phase === 'Hold' ? 1.5 : 1,
                        opacity: phase === 'Inhale' ? 0.8 : phase === 'Hold' ? 1 : 0.5
                    }}
                    transition={{ duration: 4, ease: "easeInOut" }}
                    className="absolute w-32 h-32 bg-primary/30 rounded-full blur-xl"
                />
                <motion.div
                    animate={{ scale: phase === 'Inhale' ? 1.2 : phase === 'Hold' ? 1.2 : 0.8 }}
                    transition={{ duration: 4, ease: "easeInOut" }}
                    className="z-10 w-24 h-24 bg-primary text-on-primary rounded-full flex items-center justify-center font-black shadow-[0_0_30px_rgba(var(--md-sys-color-primary),0.5)]"
                >
                    {phase}
                </motion.div>
            </div>
        </div>
    );
};

// Activity 3: Doodle Board
const DoodleBoard = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#3b82f6');
    const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

    useEffect(() => {
        if (canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                context.lineCap = 'round';
                context.lineWidth = 4;
                setCtx(context);
            }
        }
    }, [canvasRef]);

    const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!ctx || !canvasRef.current) return;
        setIsDrawing(true);
        const rect = canvasRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        ctx.beginPath();
        ctx.moveTo(clientX - rect.left, clientY - rect.top);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !ctx || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        ctx.strokeStyle = color;
        ctx.lineTo(clientX - rect.left, clientY - rect.top);
        ctx.stroke();
    };

    const stopDraw = () => {
        setIsDrawing(false);
        if (ctx) ctx.closePath();
    };

    return (
        <div className="flex flex-col items-center gap-4 w-full h-full p-4 relative">
            <h3 className="text-xl font-black text-on-surface mb-2">Doodle Pad</h3>
            <canvas
                ref={canvasRef}
                width={300}
                height={300}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
                className="bg-black/20 rounded-2xl w-full max-w-[300px] h-[300px] cursor-crosshair border border-white/10"
            />
            <div className="flex gap-4">
                {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#ffffff'].map(c => (
                    <button key={c} onClick={() => setColor(c)} className={clsx("w-6 h-6 rounded-full border-2", color === c ? "border-on-surface scale-125" : "border-transparent")} style={{ backgroundColor: c }} />
                ))}
            </div>
            <button onClick={() => ctx?.clearRect(0, 0, 300, 300)} className="absolute top-4 right-4 text-xs font-bold text-on-surface-variant hover:text-white">Clear</button>
        </div>
    );
};

// Activity 4: Tic-Tac-Toe
const TicTacToe = () => {
    const [board, setBoard] = useState(Array(9).fill(null));
    const [xIsNext, setXIsNext] = useState(true);

    const calculateWinner = (squares: any[]) => {
        const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
        for (let i = 0; i < lines.length; i++) {
            const [a, b, c] = lines[i];
            if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
                return squares[a];
            }
        }
        return null;
    };

    const winner = calculateWinner(board);

    const handleClick = (i: number) => {
        if (board[i] || winner) return;
        const newBoard = [...board];
        newBoard[i] = xIsNext ? 'X' : 'O';
        setBoard(newBoard);
        setXIsNext(!xIsNext);
    };

    return (
        <div className="flex flex-col items-center justify-center w-full h-full p-4">
            <h3 className="text-xl font-black text-on-surface mb-6">Tic-Tac-Toe</h3>
            <div className="grid grid-cols-3 gap-2 bg-surface-variant/30 p-3 rounded-2xl">
                {board.map((cell, i) => (
                    <button
                        key={i}
                        onClick={() => handleClick(i)}
                        className="w-20 h-20 bg-surface-variant/80 hover:bg-primary/20 rounded-xl text-3xl font-black text-primary transition-colors flex items-center justify-center shadow-inner"
                    >
                        {cell}
                    </button>
                ))}
            </div>
            {winner ? (
                <div className="mt-6 text-center">
                    <p className="text-2xl font-black text-green-400 mb-2">{winner} Wins!</p>
                    <button onClick={() => setBoard(Array(9).fill(null))} className="px-6 py-2 bg-primary text-on-primary rounded-full font-bold">Play Again</button>
                </div>
            ) : board.every(Boolean) ? (
                <div className="mt-6 text-center">
                    <p className="text-2xl font-black text-yellow-400 mb-2">Draw!</p>
                    <button onClick={() => setBoard(Array(9).fill(null))} className="px-6 py-2 bg-primary text-on-primary rounded-full font-bold">Play Again</button>
                </div>
            ) : (
                <p className="mt-6 font-bold text-on-surface-variant">Next Player: <span className="text-primary">{xIsNext ? 'X' : 'O'}</span></p>
            )}
        </div>
    );
};

// Activity 5: Orbiting Dots
const OrbitDots = () => {
    return (
        <div className="flex flex-col items-center justify-center w-full h-full p-4 overflow-hidden relative">
            <h3 className="text-xl font-black text-on-surface absolute top-6 z-10">Stargazer</h3>
            <div className="relative w-64 h-64 flex items-center justify-center pt-8">
                {[1, 2, 3, 4, 5].map(i => (
                    <motion.div
                        key={i}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10 + i * 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border border-primary/20 rounded-full"
                        style={{ margin: `${i * 12}px` }}
                    >
                        <motion.div className="w-4 h-4 rounded-full bg-primary absolute -top-2 left-[50%] -translate-x-1/2 shadow-[0_0_10px_rgba(var(--md-sys-color-primary),1)]" />
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

// Activity 6: Reaction Time
const ReactionTime = () => {
    const [state, setState] = useState<'idle' | 'waiting' | 'ready' | 'done'>('idle');
    const [startTime, setStartTime] = useState(0);
    const [time, setTime] = useState(0);
    const timeoutRef = useRef<any>(null);

    const start = () => {
        setState('waiting');
        timeoutRef.current = setTimeout(() => {
            setState('ready');
            setStartTime(Date.now());
        }, Math.random() * 3000 + 1000);
    };

    const click = () => {
        if (state === 'waiting') {
            clearTimeout(timeoutRef.current);
            setState('idle');
            alert("Too early!");
        } else if (state === 'ready') {
            setTime(Date.now() - startTime);
            setState('done');
        } else if (state === 'done') {
            setState('idle');
        }
    };

    return (
        <div
            onClick={state === 'idle' ? start : click}
            className={clsx(
                "flex flex-col items-center justify-center w-full h-full p-4 cursor-pointer transition-colors duration-300 rounded-3xl",
                state === 'idle' ? "bg-surface-variant/20 hover:bg-surface-variant/40" :
                    state === 'waiting' ? "bg-red-500/20" :
                        state === 'ready' ? "bg-green-500/40" : "bg-primary/20"
            )}
        >
            <Zap size={48} className={clsx("mb-4", state === 'ready' ? "text-green-400" : "text-primary")} />
            <h3 className="text-2xl font-black">
                {state === 'idle' ? "Reaction Test" :
                    state === 'waiting' ? "Wait for Green..." :
                        state === 'ready' ? "CLICK NOW!" : `${time}ms`}
            </h3>
            {state === 'idle' && <p className="text-on-surface-variant mt-2 font-medium">Click to start</p>}
            {state === 'done' && <p className="text-on-surface-variant mt-2 font-medium">Click to try again</p>}
        </div>
    );
};

// Activity 7: Memory Match
const MemoryMatch = () => {
    const EMOJIS = ['🚀', '🛸', '👽', '👾', '🌈', '🍕'];
    const [cards, setCards] = useState(() => [...EMOJIS, ...EMOJIS].sort(() => Math.random() - 0.5).map((e, i) => ({ id: i, emoji: e, flipped: false, matched: false })));
    const [flippedIdxs, setFlippedIdxs] = useState<number[]>([]);

    const flip = (index: number) => {
        if (flippedIdxs.length >= 2 || cards[index].flipped || cards[index].matched) return;
        const newCards = [...cards];
        newCards[index].flipped = true;
        setCards(newCards);
        const newFlipped = [...flippedIdxs, index];
        setFlippedIdxs(newFlipped);

        if (newFlipped.length === 2) {
            setTimeout(() => {
                const updated = [...newCards];
                if (updated[newFlipped[0]].emoji === updated[newFlipped[1]].emoji) {
                    updated[newFlipped[0]].matched = true;
                    updated[newFlipped[1]].matched = true;
                } else {
                    updated[newFlipped[0]].flipped = false;
                    updated[newFlipped[1]].flipped = false;
                }
                setCards(updated);
                setFlippedIdxs([]);
            }, 1000);
        }
    };

    return (
        <div className="flex flex-col items-center w-full h-full p-4">
            <h3 className="text-xl font-black text-on-surface mb-4">Memory Match</h3>
            <div className="grid grid-cols-4 gap-2">
                {cards.map((c, i) => (
                    <motion.div
                        key={c.id}
                        whileHover={!c.flipped && !c.matched ? { scale: 1.05 } : {}}
                        whileTap={!c.flipped && !c.matched ? { scale: 0.95 } : {}}
                        onClick={() => flip(i)}
                        className={clsx(
                            "w-16 h-16 rounded-2xl flex items-center justify-center text-3xl cursor-pointer transition-all duration-300",
                            c.flipped || c.matched ? "bg-primary/20 ring-2 ring-primary rotate-y-180" : "bg-surface-variant shadow-inner"
                        )}
                    >
                        {(c.flipped || c.matched) && <span className="animate-fade-in">{c.emoji}</span>}
                    </motion.div>
                ))}
            </div>
            {cards.every(c => c.matched) && (
                <button onClick={() => setCards([...EMOJIS, ...EMOJIS].sort(() => Math.random() - 0.5).map((e, i) => ({ id: i, emoji: e, flipped: false, matched: false })))} className="mt-6 px-6 py-2 bg-primary text-on-primary rounded-full font-bold">Play Again</button>
            )}
        </div>
    );
};

// Activity 8: Color Mixer
const ColorMixer = () => {
    const [r, setR] = useState(59);
    const [g, setG] = useState(130);
    const [b, setB] = useState(246);

    return (
        <div className="flex flex-col items-center justify-center w-full h-full p-4">
            <h3 className="text-xl font-black text-on-surface mb-6">Color Mixer</h3>
            <div className="w-32 h-32 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-colors duration-300 border-4 border-white/10 mb-8" style={{ backgroundColor: `rgb(${r},${g},${b})` }} />
            <div className="space-y-4 w-full px-8">
                <input type="range" min="0" max="255" value={r} onChange={e => setR(parseInt(e.target.value))} className="w-full h-2 rounded-full appearance-none bg-red-500/20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:rounded-full cursor-pointer" />
                <input type="range" min="0" max="255" value={g} onChange={e => setG(parseInt(e.target.value))} className="w-full h-2 rounded-full appearance-none bg-green-500/20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:rounded-full cursor-pointer" />
                <input type="range" min="0" max="255" value={b} onChange={e => setB(parseInt(e.target.value))} className="w-full h-2 rounded-full appearance-none bg-blue-500/20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full cursor-pointer" />
            </div>
            <p className="mt-6 font-mono font-bold uppercase tracking-widest text-sm opacity-60">HEX: #{((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}</p>
        </div>
    );
};

// Activity 9: Daily Quotes
const DailyQuotes = () => {
    const QUOTES = [
        "Music expresses that which cannot be put into words and that which cannot remain silent.",
        "Without music, life would be a mistake.",
        "Music gives a soul to the universe, wings to the mind, flight to the imagination and life to everything.",
        "Where words fail, music speaks.",
        "One good thing about music, when it hits you, you feel no pain."
    ];
    const [qIndex, setQIndex] = useState(0);

    return (
        <div className="flex flex-col items-center justify-center w-full h-full p-8 text-center bg-gradient-to-br from-primary/10 to-transparent rounded-3xl cursor-pointer group" onClick={() => setQIndex((qIndex + 1) % QUOTES.length)}>
            <Quote className="text-primary opacity-50 mb-6 scale-150" />
            <AnimatePresence mode="wait">
                <motion.p
                    key={qIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-lg md:text-xl font-medium italic text-on-surface-variant leading-relaxed"
                >
                    "{QUOTES[qIndex]}"
                </motion.p>
            </AnimatePresence>
            <span className="mt-8 text-xs font-black uppercase tracking-[0.2em] text-primary opacity-0 group-hover:opacity-100 transition-opacity">Click for another</span>
        </div>
    );
};

// Activity 10: Idle Clicker
const IdleClicker = () => {
    const [score, setScore] = useState(0);
    const [multiplier, setMultiplier] = useState(1);

    return (
        <div className="flex flex-col items-center justify-center w-full h-full p-4 relative overflow-hidden">
            <h3 className="text-2xl font-black text-on-surface mb-2 tracking-tighter">Music Points</h3>
            <p className="text-5xl font-black text-primary drop-shadow-[0_0_15px_rgba(var(--md-sys-color-primary),0.5)] mb-8 tabular-nums">{score}</p>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setScore(s => s + multiplier)}
                className="w-32 h-32 rounded-full bg-primary flex items-center justify-center shadow-[0_10px_40px_rgba(var(--md-sys-color-primary),0.5)] border-4 border-white/20 active:border-white/40"
            >
                <MousePointerClick size={48} className="text-on-primary drop-shadow-md" />
            </motion.button>

            <div className="absolute bottom-6 flex gap-4">
                <button
                    disabled={score < 50}
                    onClick={() => { setScore(s => s - 50); setMultiplier(m => m + 1); }}
                    className="px-4 py-2 bg-surface-variant/50 disabled:opacity-30 disabled:cursor-not-allowed rounded-full text-xs font-bold border border-white/10"
                >
                    Buy x2 Multiplier (50)
                </button>
            </div>
            {multiplier > 1 && <span className="absolute top-6 right-6 text-sm font-black text-primary">x{multiplier}</span>}
        </div>
    );
};

// Activity 11: Mini Synth
const MiniSynth = () => {
    const playNote = (frequency: number) => {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = frequency;
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 1);
        osc.stop(ctx.currentTime + 1);
    };
    const notes = [
        { name: 'C4', freq: 261.63, color: 'bg-red-500' },
        { name: 'D4', freq: 293.66, color: 'bg-orange-500' },
        { name: 'E4', freq: 329.63, color: 'bg-yellow-500' },
        { name: 'F4', freq: 349.23, color: 'bg-green-500' },
        { name: 'G4', freq: 392.00, color: 'bg-cyan-500' },
        { name: 'A4', freq: 440.00, color: 'bg-blue-500' },
        { name: 'B4', freq: 493.88, color: 'bg-purple-500' },
        { name: 'C5', freq: 523.25, color: 'bg-pink-500' },
    ];
    return (
        <div className="flex flex-col items-center justify-center w-full h-full p-4">
            <h3 className="text-xl font-black text-on-surface mb-6">Mini Synth</h3>
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-[400px]">
                {notes.map((n, i) => (
                    <motion.button
                        key={i}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onPointerDown={(e) => {
                            e.preventDefault();
                            playNote(n.freq);
                        }}
                        className={`w-16 h-40 ${n.color}/80 hover:${n.color} rounded-xl shadow-lg border-b-8 border-black/20 text-white font-bold flex items-end justify-center pb-4 transition-colors`}
                    >
                        {n.name}
                    </motion.button>
                ))}
            </div>
            <p className="mt-8 text-sm font-medium text-on-surface-variant">Tap to play a tune!</p>
        </div>
    );
};

// Activity 12: Rock, Paper, Scissors
const RockPaperScissors = () => {
    const choices = ['✊', '✋', '✌️'];
    const [result, setResult] = useState<string | null>(null);
    const [player, setPlayer] = useState<string | null>(null);
    const [computer, setComputer] = useState<string | null>(null);

    const play = (idx: number) => {
        const compIdx = Math.floor(Math.random() * 3);
        setPlayer(choices[idx]);
        setComputer(choices[compIdx]);
        if (idx === compIdx) setResult("It's a draw!");
        else if (
            (idx === 0 && compIdx === 2) ||
            (idx === 1 && compIdx === 0) ||
            (idx === 2 && compIdx === 1)
        ) setResult("You Win! 🎉");
        else setResult("You Lose! 😢");
    };

    return (
        <div className="flex flex-col items-center justify-center w-full h-full p-4">
            <h3 className="text-xl font-black text-on-surface mb-8">Rock, Paper, Scissors</h3>
            <div className="flex justify-between items-center w-full max-w-sm px-8 mb-12">
                <div className="flex flex-col items-center">
                    <span className="text-sm font-bold text-primary mb-2 uppercase tracking-widest">You</span>
                    <div className="w-24 h-24 rounded-full bg-surface-variant flex items-center justify-center text-5xl shadow-inner border border-white/5">{player || '?'}</div>
                </div>
                <div className="text-2xl font-black text-on-surface-variant opacity-50">VS</div>
                <div className="flex flex-col items-center">
                    <span className="text-sm font-bold text-red-400 mb-2 uppercase tracking-widest">Bot</span>
                    <div className="w-24 h-24 rounded-full bg-surface-variant flex items-center justify-center text-5xl shadow-inner border border-white/5">{computer || '?'}</div>
                </div>
            </div>

            {result ? (
                <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                    <p className={`text-3xl font-black mb-6 drop-shadow-lg ${result.includes('Win') ? 'text-green-400' : result.includes('Lose') ? 'text-red-400' : 'text-yellow-400'}`}>{result}</p>
                    <button onClick={() => setResult(null)} className="px-8 py-3 bg-primary text-on-primary rounded-full font-black uppercase tracking-widest text-sm shadow-lg hover:scale-105 active:scale-95 transition-all">Play Again</button>
                </motion.div>
            ) : (
                <div className="flex gap-4">
                    {choices.map((c, i) => (
                        <motion.button
                            key={i}
                            whileHover={{ scale: 1.1, y: -5 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => play(i)}
                            className="w-16 h-16 rounded-2xl bg-surface-variant/50 hover:bg-primary/20 text-4xl shadow-lg border border-white/10 flex items-center justify-center transition-colors"
                        >
                            {c}
                        </motion.button>
                    ))}
                </div>
            )}
        </div>
    );
};

// Activity 13: Fast Clicker Battle (2P)
const ClickerBattle = () => {
    const [p1, setP1] = useState(0);
    const [p2, setP2] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [gameState, setGameState] = useState<'idle' | 'running' | 'done'>('idle');

    const start = () => {
        setP1(0); setP2(0); setTimeLeft(5); setGameState('running');
    };

    useEffect(() => {
        if (gameState === 'running' && timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else if (timeLeft === 0 && gameState === 'running') {
            setGameState('done');
        }
    }, [timeLeft, gameState]);

    return (
        <div className="flex flex-col items-center justify-center w-full h-full p-4 gap-8">
            <h3 className="text-xl font-black text-on-surface">Clicker Battle (2P)</h3>
            {gameState === 'idle' ? (
                <button onClick={start} className="px-8 py-4 bg-primary text-on-primary rounded-full font-black text-xl shadow-xl shadow-primary/20">START DUEL</button>
            ) : (
                <div className="flex w-full items-center justify-around">
                    <div className="flex flex-col items-center gap-4">
                        <span className="text-sm font-bold text-primary uppercase">Player 1</span>
                        <button
                            disabled={gameState !== 'running'}
                            onClick={() => setP1(s => s + 1)}
                            className="w-32 h-32 rounded-3xl bg-primary/20 hover:bg-primary/40 text-4xl font-black text-primary transition-all active:scale-95 disabled:opacity-50"
                        >
                            {p1}
                        </button>
                    </div>
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-surface-variant flex items-center justify-center text-3xl font-black text-on-surface-variant ring-4 ring-white/5">{timeLeft}s</div>
                        {gameState === 'done' && <p className="font-black text-2xl text-green-400">WINNER: {p1 > p2 ? 'P1' : p2 > p1 ? 'P2' : 'DRAW'}</p>}
                    </div>
                    <div className="flex flex-col items-center gap-4">
                        <span className="text-sm font-bold text-secondary uppercase">Player 2</span>
                        <button
                            disabled={gameState !== 'running'}
                            onClick={() => setP2(s => s + 1)}
                            className="w-32 h-32 rounded-3xl bg-secondary/20 hover:bg-secondary/40 text-4xl font-black text-secondary transition-all active:scale-95 disabled:opacity-50"
                        >
                            {p2}
                        </button>
                    </div>
                </div>
            )}
            {gameState === 'done' && <button onClick={start} className="mt-4 text-xs font-black uppercase tracking-widest text-primary hover:underline">Play Again</button>}
        </div>
    );
};

// Activity 14: Snake
const SnakeGame = () => {
    const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
    const [food, setFood] = useState({ x: 5, y: 5 });
    const [dir, setDir] = useState({ x: 0, y: -1 });
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);

    useEffect(() => {
        if (gameOver) return;
        const move = setInterval(() => {
            setSnake(s => {
                const head = { x: s[0].x + dir.x, y: s[0].y + dir.y };
                if (head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20 || s.some(b => b.x === head.x && b.y === head.y)) {
                    setGameOver(true);
                    return s;
                }
                const newSnake = [head, ...s];
                if (head.x === food.x && head.y === food.y) {
                    setScore(sc => sc + 10);
                    setFood({ x: Math.floor(Math.random() * 20), y: Math.floor(Math.random() * 20) });
                } else {
                    newSnake.pop();
                }
                return newSnake;
            });
        }, 150);
        return () => clearInterval(move);
    }, [dir, food, gameOver]);

    return (
        <div className="flex flex-col items-center p-4 gap-4">
            <h3 className="text-xl font-black text-on-surface">Snake Classic</h3>
            <div className="relative w-[300px] h-[300px] bg-black/40 rounded-2xl border border-white/10 overflow-hidden">
                {snake.map((b, i) => (
                    <div key={i} className="absolute bg-primary rounded-sm transition-all" style={{ width: '15px', height: '15px', left: `${b.x * 15}px`, top: `${b.y * 15}px` }} />
                ))}
                <div className="absolute bg-green-400 rounded-full animate-pulse" style={{ width: '15px', height: '15px', left: `${food.x * 15}px`, top: `${food.y * 15}px` }} />
                {gameOver && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4">
                        <p className="text-3xl font-black text-red-400">GAME OVER</p>
                        <button onClick={() => { setSnake([{ x: 10, y: 10 }]); setDir({ x: 0, y: -1 }); setGameOver(false); setScore(0); }} className="px-6 py-2 bg-primary text-on-primary rounded-full font-bold">Restart</button>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-3 gap-2">
                <div /> <button onClick={() => setDir({ x: 0, y: -1 })} className="p-3 bg-surface-variant rounded-xl"><ChevronLeft className="rotate-90" /></button> <div />
                <button onClick={() => setDir({ x: -1, y: 0 })} className="p-3 bg-surface-variant rounded-xl"><ChevronLeft /></button>
                <div className="flex items-center justify-center font-black text-primary">{score}</div>
                <button onClick={() => setDir({ x: 1, y: 0 })} className="p-3 bg-surface-variant rounded-xl"><ChevronRight /></button>
                <div /> <button onClick={() => setDir({ x: 0, y: 1 })} className="p-3 bg-surface-variant rounded-xl"><ChevronRight className="rotate-90" /></button> <div />
            </div>
        </div>
    );
};

// Activity 15: Reflex Duel (2P)
const ReflexDuel = () => {
    const [state, setState] = useState<'idle' | 'waiting' | 'ready' | 'done'>('idle');
    const [winner, setWinner] = useState<number | null>(null);
    const timeout = useRef<any>(null);

    const start = () => {
        setState('waiting'); setWinner(null);
        timeout.current = setTimeout(() => setState('ready'), Math.random() * 4000 + 2000);
    };

    const press = (p: number) => {
        if (state === 'waiting') {
            clearTimeout(timeout.current); setState('idle'); alert(`Player ${p} was too early!`);
        } else if (state === 'ready') {
            setWinner(p); setState('done');
        }
    };

    return (
        <div className="flex flex-col items-center justify-around w-full h-full p-4 gap-8">
            <button disabled={state === 'done'} onClick={() => press(1)} className={clsx("w-full h-1/3 rounded-3xl transition-colors font-black text-4xl flex items-center justify-center", state === 'ready' ? 'bg-green-500 hover:bg-green-400 cursor-pointer' : winner === 1 ? 'bg-green-600' : 'bg-primary/20')}>P1</button>
            <div className="flex flex-col items-center gap-4">
                {state === 'idle' ? <button onClick={start} className="px-8 py-3 bg-white text-black font-black uppercase rounded-full tracking-widest">START DUEL</button> :
                    state === 'waiting' ? <p className="text-red-400 font-black animate-pulse">WAIT FOR GREEN...</p> :
                        state === 'ready' ? <p className="text-green-400 font-black text-2xl">REACT NOW!</p> : <button onClick={start} className="px-8 py-3 bg-surface-variant rounded-full text-xs font-black">REMATCH</button>}
            </div>
            <button disabled={state === 'done'} onClick={() => press(2)} className={clsx("w-full h-1/3 rounded-3xl transition-colors font-black text-4xl flex items-center justify-center", state === 'ready' ? 'bg-green-500 hover:bg-green-400 cursor-pointer' : winner === 2 ? 'bg-green-600' : 'bg-primary/20')}>P2</button>
        </div>
    );
};

// Activity 16: Tap Tempo
const TapTempo = () => {
    const [taps, setTaps] = useState<number[]>([]);
    const [bpm, setBpm] = useState(0);

    const handleTap = () => {
        const now = Date.now();
        const newTaps = [...taps, now].slice(-8);
        setTaps(newTaps);
        if (newTaps.length > 1) {
            const intervals = [];
            for (let i = 1; i < newTaps.length; i++) intervals.push(newTaps[i] - newTaps[i - 1]);
            const avg = intervals.reduce((a, b) => a + b) / intervals.length;
            setBpm(Math.round(60000 / avg));
        }
    };

    return (
        <div className="flex flex-col items-center justify-center gap-8 w-full p-4">
            <h3 className="text-xl font-black text-on-surface">Tap Tempo</h3>
            <div className="text-7xl font-black text-primary drop-shadow-[0_0_20px_rgba(var(--md-sys-color-primary),0.5)]">{bpm || '--'}</div>
            <button onPointerDown={handleTap} className="w-48 h-48 rounded-full bg-primary/20 border-4 border-primary hover:bg-primary/30 active:scale-95 transition-all flex items-center justify-center">
                <Zap size={64} className="text-primary" />
            </button>
            <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest">Tap to the beat</p>
        </div>
    );
};

// Activity 17: Simon Says
const SimonSays = () => {
    const [sequence, setSequence] = useState<number[]>([]);
    const [userSeq, setUserSeq] = useState<number[]>([]);
    const [playing, setPlaying] = useState(false);
    const [active, setActive] = useState<number | null>(null);

    const nextLevel = () => {
        const newSeq = [...sequence, Math.floor(Math.random() * 4)];
        setSequence(newSeq);
        setPlaying(true);
        playSeq(newSeq);
    };

    const playSeq = async (seq: number[]) => {
        for (let i = 0; i < seq.length; i++) {
            setActive(seq[i]);
            await new Promise(r => setTimeout(r, 600));
            setActive(null);
            await new Promise(r => setTimeout(r, 200));
        }
        setPlaying(false);
        setUserSeq([]);
    };

    const check = (idx: number) => {
        if (playing) return;
        const newU = [...userSeq, idx];
        setUserSeq(newU);
        setActive(idx); setTimeout(() => setActive(null), 200);
        if (newU[newU.length - 1] !== sequence[newU.length - 1]) {
            alert("Wrong sequence!"); setSequence([]);
        } else if (newU.length === sequence.length) {
            setTimeout(nextLevel, 1000);
        }
    };

    return (
        <div className="flex flex-col items-center gap-6 p-4">
            <h3 className="text-xl font-black text-on-surface">Simon Says</h3>
            <div className="grid grid-cols-2 gap-4">
                {['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500'].map((c, i) => (
                    <button key={i} onClick={() => check(i)} className={clsx("w-24 h-24 rounded-3xl transition-all", c, active === i ? 'opacity-100 scale-110 shadow-[0_0_30px_white]' : 'opacity-40')} />
                ))}
            </div>
            {sequence.length === 0 && <button onClick={nextLevel} className="px-6 py-2 bg-primary text-on-primary rounded-full font-bold">Start Game</button>}
            <p className="font-bold text-primary">Score: {sequence.length}</p>
        </div>
    );
};

// Activity 18: Dice Duel (2P)
const DiceDuel = () => {
    const [d1, setD1] = useState(1);
    const [d2, setD2] = useState(1);
    const [rolling, setRolling] = useState(false);

    const roll = () => {
        setRolling(true);
        setTimeout(() => {
            setD1(Math.floor(Math.random() * 6) + 1);
            setD2(Math.floor(Math.random() * 6) + 1);
            setRolling(false);
        }, 600);
    };

    const DICE = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

    return (
        <div className="flex flex-col items-center justify-center gap-8 w-full p-4">
            <h3 className="text-xl font-black text-on-surface">Dice Duel</h3>
            <div className="flex justify-around w-full items-center">
                <div className="flex flex-col items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-widest text-primary">P1</span>
                    <div className={clsx("text-8xl transition-all", rolling && 'animate-bounce')}>{DICE[d1 - 1]}</div>
                </div>
                <div className="text-4xl font-black text-on-surface-variant/20 italic">VS</div>
                <div className="flex flex-col items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-widest text-secondary">P2</span>
                    <div className={clsx("text-8xl transition-all", rolling && 'animate-bounce delay-100')}>{DICE[d2 - 1]}</div>
                </div>
            </div>
            <button onClick={roll} disabled={rolling} className="p-8 bg-surface-variant/30 hover:bg-primary/20 rounded-full transition-all border border-white/10 active:scale-95">
                <Drip size={48} className={clsx("text-primary", rolling && 'animate-spin')} />
            </button>
            {!rolling && d1 !== d2 && <p className="text-2xl font-black text-white italic">{d1 > d2 ? 'P1 WINS!' : 'P2 WINS!'}</p>}
        </div>
    );
};

// Activity 19: Particle Flow
const ParticleFlow = () => {
    const [particles, setParticles] = useState<{ x: number, y: number, id: number }[]>([]);

    return (
        <div
            className="w-full h-full relative overflow-hidden bg-black/20 rounded-3xl"
            onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setParticles(p => [...p, { x: e.clientX - rect.left, y: e.clientY - rect.top, id: Date.now() }].slice(-20));
            }}
        >
            <h3 className="absolute top-4 left-1/2 -translate-x-1/2 text-sm font-black text-on-surface-variant opacity-40 uppercase tracking-widest">Wave pointer</h3>
            <AnimatePresence>
                {particles.map(p => (
                    <motion.div
                        key={p.id}
                        initial={{ scale: 0, opacity: 1, x: p.x, y: p.y }}
                        animate={{ scale: 4, opacity: 0, x: p.x + (Math.random() - 0.5) * 100, y: p.y + (Math.random() - 0.5) * 100 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="absolute w-2 h-2 rounded-full bg-primary/40 blur-sm pointer-events-none"
                    />
                ))}
            </AnimatePresence>
        </div>
    );
};

// Activity 20: Color Duel (2P)
const ColorDuel = () => {
    const [target, setTarget] = useState('#ffffff');
    const [options, setOptions] = useState<string[]>([]);
    const [score, setScore] = useState([0, 0]);

    const next = () => {
        const gene = () => `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
        const newTarget = gene();
        setTarget(newTarget);
        setOptions([newTarget, gene(), gene(), gene()].sort(() => Math.random() - 0.5));
    };

    useEffect(next, []);

    const pick = (p: number, color: string) => {
        if (color === target) {
            const news = [...score]; news[p]++; setScore(news); next();
        } else {
            alert(`Player ${p + 1} picked wrong!`);
        }
    };

    return (
        <div className="flex flex-col items-center justify-between h-full w-full p-4 gap-4">
            <h3 className="text-xl font-black text-on-surface">Color Duel</h3>
            <div className="flex justify-between w-full px-8">
                <div className="text-xl font-black text-primary">P1: {score[0]}</div>
                <div className="w-24 h-24 rounded-2xl shadow-xl ring-4 ring-white/10" style={{ backgroundColor: target }} />
                <div className="text-xl font-black text-secondary">P2: {score[1]}</div>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full">
                {options.map((c, i) => (
                    <div key={i} className="flex flex-col gap-2">
                        <div className="flex gap-2">
                            <button onClick={() => pick(0, c)} className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary/20 text-primary hover:bg-primary hover:text-on-primary transition-all">P1</button>
                            <button onClick={() => pick(1, c)} className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest bg-secondary/20 text-secondary hover:bg-secondary hover:text-on-secondary transition-all">P2</button>
                        </div>
                        <div className="h-4 rounded-full" style={{ backgroundColor: c }} />
                    </div>
                ))}
            </div>
        </div>
    );
};

const ACTIVITIES = [
    { id: 'bubble', title: 'Bubble Wrap', icon: Grid3X3, component: BubbleWrap, desc: "Pop them all!" },
    { id: 'zen', title: 'Zen Breathing', icon: Wind, component: ZenBreathing, desc: "Breathe in, breathe out" },
    { id: 'doodle', title: 'Doodle Pad', icon: Palette, component: DoodleBoard, desc: "Draw your vibe" },
    { id: 'tictac', title: 'Tic-Tac-Toe', icon: Hash, component: TicTacToe, desc: "A quick classic" },
    { id: 'orbit', title: 'Stargazer', icon: Orbit, component: OrbitDots, desc: "Watch the orbits pass" },
    { id: 'reaction', title: 'Reaction Test', icon: Zap, component: ReactionTime, desc: "Test your speed" },
    { id: 'memory', title: 'Memory Match', icon: Copy, component: MemoryMatch, desc: "Find the pairs" },
    { id: 'color', title: 'Color Mixer', icon: Droplet, component: ColorMixer, desc: "Discover hex codes" },
    { id: 'quotes', title: 'Daily Quotes', icon: Quote, component: DailyQuotes, desc: "Deep thoughts & music" },
    { id: 'clicker', title: 'Idle Clicker', icon: MousePointerClick, component: IdleClicker, desc: "Click for points" },
    { id: 'synth', title: 'Mini Synth', icon: Keyboard, component: MiniSynth, desc: "Play a quick tune" },
    { id: 'rps', title: 'R-P-S', icon: Hand, component: RockPaperScissors, desc: "Battle the bot" },
    { id: 'duel', title: 'Fast Clicker', icon: Zap, component: ClickerBattle, desc: "2P Battle!" },
    { id: 'snake', title: 'Snake', icon: Grid3X3, component: SnakeGame, desc: "Eat & Grow" },
    { id: 'reflex', title: 'Reflex Duel', icon: Zap, component: ReflexDuel, desc: "2P Reflex War" },
    { id: 'tempo', title: 'Tap Tempo', icon: Zap, component: TapTempo, desc: "Catch the BPM" },
    { id: 'simon', title: 'Simon Says', icon: Hash, component: SimonSays, desc: "Watch & Repeat" },
    { id: 'dice', title: 'Dice Duel', icon: Grip, component: DiceDuel, desc: "2P Roll War" },
    { id: 'flow', title: 'Particle', icon: Wind, component: ParticleFlow, desc: "Move & Flow" },
    { id: 'cduel', title: 'Color Duel', icon: Palette, component: ColorDuel, desc: "2P Color Race" },
];

// Fallback icons for missing ones
function Grid3X3(props: any) { return <Grip {...props} />; }
function Copy(props: any) { return <Maximize {...props} />; }
function Drip(props: any) { return <Wind {...props} />; }

export default function FunPage() {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const itemsPerPage = 10;

    // Stop document scroll when modal is open
    useEffect(() => {
        if (selectedId) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [selectedId]);

    const activeActivity = ACTIVITIES.find(a => a.id === selectedId);
    const totalPages = Math.ceil(ACTIVITIES.length / itemsPerPage);
    const paginatedActivities = ACTIVITIES.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

    return (
        <div className="relative min-h-[100vh] pb-32">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 max-w-[1600px] mx-auto space-y-12 pt-12"
            >
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-white/5 pb-8">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-2xl shadow-primary/20 rotate-3 border border-primary/30 outline outline-1 outline-primary/10">
                            <Gamepad2 size={32} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tighter text-primary italic leading-none">
                                Fun Zone
                            </h1>
                            <p className="text-on-surface-variant font-medium text-[10px] tracking-widest opacity-60">20 Mini-Activities • Page {currentPage + 1} Of {totalPages}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex bg-surface-variant/20 p-1 rounded-2xl border border-white/5 mr-4">
                            <button
                                disabled={currentPage === 0}
                                onClick={() => setCurrentPage(p => p - 1)}
                                className="p-3 disabled:opacity-20 hover:bg-primary/20 rounded-xl transition-all"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div className="flex items-center px-4 font-black text-sm text-primary italic">
                                {currentPage + 1} / {totalPages}
                            </div>
                            <button
                                disabled={currentPage === totalPages - 1}
                                onClick={() => setCurrentPage(p => p + 1)}
                                className="p-3 disabled:opacity-20 hover:bg-primary/20 rounded-xl transition-all"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                        <button
                            onClick={() => {
                                const randomAct = ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)];
                                setSelectedId(randomAct.id);
                            }}
                            className="flex items-center gap-3 px-6 py-3 bg-primary/10 hover:bg-primary text-primary hover:text-on-primary rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-primary/20 shadow-xl shadow-primary/5 active:scale-95 group"
                        >
                            <Zap size={18} className="group-hover:animate-bounce" />
                            <span>Random Fun</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-8">
                    {paginatedActivities.map((Activity, idx) => (
                        <motion.div
                            key={Activity.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedId(Activity.id)}
                            className="bg-surface-variant/20 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 flex flex-col items-center justify-center gap-6 cursor-pointer hover:bg-surface-variant/40 hover:border-primary/50 transition-all shadow-2xl hover:shadow-primary/30 group h-80 relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-transparent transition-all" />
                            <div className="w-20 h-20 rounded-[2rem] bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-all duration-500 text-primary group-hover:-translate-y-4 shadow-xl">
                                <Activity.icon size={40} />
                            </div>
                            <div className="text-center relative z-10 transition-transform duration-500 group-hover:-translate-y-2">
                                <h3 className="font-black text-2xl text-primary tracking-tighter uppercase italic">{Activity.title}</h3>
                                <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.3em] mt-2 opacity-50 group-hover:opacity-100 transition-opacity">{Activity.desc}</p>
                            </div>
                            <div className="absolute bottom-6 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary px-4 py-2 bg-primary/10 rounded-full">Explore Activity</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* Modal Overlay */}
            <AnimatePresence>
                {selectedId && activeActivity && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8" style={{ pointerEvents: 'auto' }}>
                        {/* Backdrop Blur */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-xl"
                            onClick={() => setSelectedId(null)}
                        />

                        {/* Modal Content */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
                            className="relative w-full max-w-4xl bg-surface border border-white/10 rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col m-auto min-h-[500px]"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-surface to-transparent">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                        <activeActivity.icon size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-on-surface leading-tight">{activeActivity.title}</h2>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedId(null)}
                                    className="w-12 h-12 rounded-full bg-surface-variant text-on-surface flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-lg hover:rotate-90 active:scale-90"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Activity Render */}
                            <div className="flex-1 w-full h-full pt-20 pb-8 px-8 flex items-center justify-center relative z-0">
                                <activeActivity.component />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
