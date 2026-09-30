import { useEffect, useRef } from 'react';

interface Props {
    active: boolean;
    playing: boolean;
    lowPower: boolean;
}

/**
 * Three layered waves driven by the player's AnalyserNode. Frame-capped (30 fps,
 * 15 in low power), drawn at ≤1.5× device pixel ratio, and fully stopped when the
 * scene isn't visible, playback is paused or the window is hidden.
 */
const HorizonWaves = ({ active, playing, lowPower }: Props) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !active) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            const r = Math.min(window.devicePixelRatio || 1, 1.5);
            canvas.width = canvas.clientWidth * r;
            canvas.height = canvas.clientHeight * r;
        };
        resize();
        window.addEventListener('resize', resize);

        const root = canvas.closest('.amb') as HTMLElement | null;
        const colors = () => {
            const cs = root ? getComputedStyle(root) : null;
            return ['--a1', '--a2', '--a3'].map(v => `rgb(${cs?.getPropertyValue(v).trim() || '79 216 216'})`);
        };
        let palette = colors();
        const paletteTimer = window.setInterval(() => { palette = colors(); }, 2000);

        const analyser: AnalyserNode | undefined = (window as any)._audioAnalyser;
        const bins = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
        const interval = 1000 / (lowPower ? 15 : 30);
        let raf = 0, last = 0, phase = 0;
        const bands = [0.5, 0.5, 0.5];

        const draw = (now: number) => {
            raf = requestAnimationFrame(draw);
            if (document.hidden || now - last < interval) return;
            last = now;

            // Low / mid / high energy, eased so the waves swell instead of jitter
            if (analyser && bins && playing) {
                analyser.getByteFrequencyData(bins);
                const n = bins.length;
                const avg = (a: number, b: number) => {
                    let s = 0;
                    for (let i = a; i < b; i++) s += bins[i];
                    return s / Math.max(b - a, 1) / 255;
                };
                const target = [avg(0, n * 0.08), avg(n * 0.08, n * 0.3), avg(n * 0.3, n * 0.7)];
                for (let k = 0; k < 3; k++) bands[k] += (target[k] - bands[k]) * 0.2;
            }
            if (playing) phase += 0.04;

            const w = canvas.width, h = canvas.height;
            ctx.clearRect(0, 0, w, h);
            for (let k = 0; k < 3; k++) {
                const base = h * (0.35 + k * 0.18);
                const amp = h * (0.03 + 0.12 * bands[k]) * (1 - k * 0.15);
                ctx.beginPath();
                for (let x = 0; x <= w; x += 12) {
                    const y = base
                        + Math.sin((x / w) * Math.PI * (2 + k) + phase * (1 + k * 0.3)) * amp
                        + Math.sin((x / w) * Math.PI * 7 - phase * 1.7) * amp * 0.25;
                    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.lineTo(w, h);
                ctx.lineTo(0, h);
                ctx.closePath();
                ctx.globalAlpha = 0.28 - k * 0.05;
                ctx.fillStyle = palette[k];
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            // Paused: draw one resting frame, then stop the loop entirely
            if (!playing) cancelAnimationFrame(raf);
        };
        raf = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(raf);
            window.clearInterval(paletteTimer);
            window.removeEventListener('resize', resize);
        };
    }, [active, playing, lowPower]);

    return <canvas ref={canvasRef} aria-hidden="true" />;
};

export default HorizonWaves;
