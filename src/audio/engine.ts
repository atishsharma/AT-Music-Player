import { EQ_BANDS } from '../store/equalizerStore';

/**
 * Web Audio graph for the player:
 *
 *   deck A ─ source ─ level ─ fade ─┐
 *                                   ├─ bus ─ sing-along (dry/wet) ─ EQ ×10 ─ limiter ─ analyser ─ master ─ out
 *   deck B ─ source ─ level ─ fade ─┘
 *
 * Two decks allow crossfades and gapless hand-offs. `level` is a slow automatic
 * gain per deck (loudness levelling), `fade` is the crossfade envelope, `master`
 * is the user volume. The analyser sits before `master` so visualisers don't
 * shrink with the volume.
 */

export interface Deck {
    el: HTMLAudioElement;
    level: GainNode;
    fade: GainNode;
    meter: AnalyserNode;
}

export interface AudioEngine {
    ctx: AudioContext;
    decks: [Deck, Deck];
    analyser: AnalyserNode;
    eq: BiquadFilterNode[];
    setVolume: (v: number) => void;
    setVocalReduction: (amount: number) => void;
    setNormalize: (on: boolean) => void;
    fadeTo: (deck: Deck, from: number, to: number, seconds: number) => void;
    /** A deck starts a new song: forget its old loudness estimate */
    resetLevel: (index: number) => void;
    dispose: () => void;
}

// Loudness levelling: aim for this RMS, never boost/cut beyond these limits
const TARGET_RMS = 0.14;
const MIN_GAIN = 0.35;
const MAX_GAIN = 2.5;

export function createAudioEngine(elements: [HTMLAudioElement, HTMLAudioElement]): AudioEngine {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx({ latencyHint: 'playback' });

    const bus = ctx.createGain();

    const decks = elements.map((el) => {
        const source = ctx.createMediaElementSource(el);
        const level = ctx.createGain();
        const fade = ctx.createGain();
        const meter = ctx.createAnalyser();
        meter.fftSize = 2048;
        source.connect(level);
        source.connect(meter); // measured pre-level, so the levelling doesn't chase itself
        level.connect(fade);
        fade.connect(bus);
        return { el, level, fade, meter };
    }) as [Deck, Deck];

    // Sing-along: centre-panned vocals cancel in L−R; bass is added back from a low-pass of the mix.
    const post = ctx.createGain();
    const dry = ctx.createGain();
    const wet = ctx.createGain();
    wet.gain.value = 0;
    bus.connect(dry);
    dry.connect(post);

    const splitter = ctx.createChannelSplitter(2);
    const invertR = ctx.createGain();
    invertR.gain.value = -1;
    const side = ctx.createGain();
    side.gain.value = 0.85;
    const merger = ctx.createChannelMerger(2);
    const bass = ctx.createBiquadFilter();
    bass.type = 'lowpass';
    bass.frequency.value = 170;
    bus.connect(splitter);
    splitter.connect(side, 0);
    splitter.connect(invertR, 1);
    invertR.connect(side);
    side.connect(merger, 0, 0);
    side.connect(merger, 0, 1);
    merger.connect(wet);
    bus.connect(bass);
    bass.connect(wet);
    wet.connect(post);

    const eq = EQ_BANDS.map((band, i) => {
        const f = ctx.createBiquadFilter();
        f.type = i === 0 ? 'lowshelf' : i === EQ_BANDS.length - 1 ? 'highshelf' : 'peaking';
        f.frequency.value = band.frequency;
        f.gain.value = 0;
        f.Q.value = 1.4;
        return f;
    });
    post.connect(eq[0]);
    for (let i = 0; i < eq.length - 1; i++) eq[i].connect(eq[i + 1]);

    // Brick-wall-ish limiter: keeps boosted EQ / levelling / overlapping decks from clipping
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -2;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.15;
    eq[eq.length - 1].connect(limiter);

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    limiter.connect(analyser);

    const master = ctx.createGain();
    analyser.connect(master);
    master.connect(ctx.destination);

    // Levelling loop: slow EMA of each deck's RMS → gain toward the target
    let normalize = false;
    const buf = new Float32Array(2048);
    const rmsAvg = [0, 0];
    const timer = window.setInterval(() => {
        decks.forEach((d, i) => {
            if (!normalize) return;
            if (d.el.paused) return;
            d.meter.getFloatTimeDomainData(buf);
            let sum = 0;
            for (let j = 0; j < buf.length; j++) sum += buf[j] * buf[j];
            const rms = Math.sqrt(sum / buf.length);
            if (rms < 0.005) return; // silence / intro: don't pump up the noise floor
            // Fast start for a new song, then a slow average (~6 s)
            rmsAvg[i] = rmsAvg[i] === 0 ? rms : rmsAvg[i] * 0.96 + rms * 0.04;
            const gain = Math.min(MAX_GAIN, Math.max(MIN_GAIN, TARGET_RMS / rmsAvg[i]));
            d.level.gain.setTargetAtTime(gain, ctx.currentTime, 0.8);
        });
    }, 150);

    const engine: AudioEngine = {
        ctx,
        decks,
        analyser,
        eq,
        setVolume: (v) => master.gain.setTargetAtTime(v, ctx.currentTime, 0.015),
        setVocalReduction: (a) => {
            const amount = Math.min(1, Math.max(0, a));
            dry.gain.setTargetAtTime(1 - amount, ctx.currentTime, 0.05);
            wet.gain.setTargetAtTime(amount, ctx.currentTime, 0.05);
        },
        setNormalize: (on) => {
            normalize = on;
            if (!on) decks.forEach(d => d.level.gain.setTargetAtTime(1, ctx.currentTime, 0.3));
        },
        fadeTo: (deck, from, to, seconds) => {
            const g = deck.fade.gain;
            const now = ctx.currentTime;
            g.cancelScheduledValues(now);
            if (seconds <= 0) { g.setValueAtTime(to, now); return; }
            // Equal-power curve: the overlap doesn't dip or bulge in loudness
            const steps = 64;
            const curve = new Float32Array(steps);
            for (let i = 0; i < steps; i++) {
                const t = i / (steps - 1);
                const p = to > from ? Math.sin(t * Math.PI / 2) : Math.cos(t * Math.PI / 2);
                curve[i] = to > from ? from + (to - from) * p : to + (from - to) * p;
            }
            g.setValueCurveAtTime(curve, now, seconds); // starts at `from`, so no separate set needed
        },
        resetLevel: (i) => { rmsAvg[i] = 0; },
        dispose: () => {
            window.clearInterval(timer);
            ctx.close();
        },
    };
    return engine;
}
