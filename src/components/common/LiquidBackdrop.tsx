import { useEffect, useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { toAtmusicUrl } from '../../utils/path';

/**
 * Average colour of an image, sampled on a tiny canvas. Returns an "R G B" triplet
 * or null when the image can't be read (e.g. a remote thumbnail without CORS).
 */
function sampleColor(src: string): Promise<string | null> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = canvas.height = 12;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (!ctx) return resolve(null);
                ctx.drawImage(img, 0, 0, 12, 12);
                const { data } = ctx.getImageData(0, 0, 12, 12);
                let r = 0, g = 0, b = 0, n = 0;
                for (let i = 0; i < data.length; i += 4) {
                    // Skip near-black / near-white pixels so borders don't wash the colour out
                    const max = Math.max(data[i], data[i + 1], data[i + 2]);
                    const min = Math.min(data[i], data[i + 1], data[i + 2]);
                    if (max < 24 || min > 235) continue;
                    r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
                }
                if (!n) return resolve(null);
                resolve(`${Math.round(r / n)} ${Math.round(g / n)} ${Math.round(b / n)}`);
            } catch {
                resolve(null); // tainted canvas
            }
        };
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

/**
 * Liquid Glass ambient backdrop: the current artwork, heavily blurred, plus two slow
 * drifting orbs tinted by the artwork's average colour. Everything is static except
 * transform/opacity animations, so it stays on the compositor.
 */
const LiquidBackdrop = () => {
    const currentTrack = usePlayerStore(s => s.currentTrack);
    const art = toAtmusicUrl(currentTrack?.image_path || currentTrack?.thumbnail || '');
    // Keep the previous image underneath while the next one fades in
    const [layers, setLayers] = useState<{ key: number; url: string }[]>([]);

    useEffect(() => {
        if (!art) return;
        setLayers(prev => [...prev.slice(-1), { key: Date.now(), url: art }]);
        let cancelled = false;
        sampleColor(art).then((rgb) => {
            if (cancelled) return;
            if (rgb) document.body.style.setProperty('--lg-ambient', rgb);
            else document.body.style.removeProperty('--lg-ambient');
        });
        return () => { cancelled = true; };
    }, [art]);

    return (
        <div className="lg-backdrop" aria-hidden="true">
            <div
                className="lg-orb"
                style={{ width: '55vw', height: '55vw', left: '-10vw', top: '-20vw', background: 'rgb(var(--lg-ambient) / 0.55)' }}
            />
            <div
                className="lg-orb"
                style={{ width: '45vw', height: '45vw', right: '-12vw', bottom: '-18vw', background: 'rgb(var(--md-sys-color-primary) / 0.35)', animationDuration: '32s', animationDelay: '-8s' }}
            />
            {layers.map((layer, i) => (
                <div
                    key={layer.key}
                    className="lg-backdrop-art"
                    style={{ backgroundImage: `url("${layer.url}")` }}
                    // Newest layer fades in over the previous one, which is then dropped
                    onAnimationEnd={() => i === layers.length - 1 && setLayers(l => l.slice(-1))}
                />
            ))}
            <div className="lg-backdrop-veil" />
        </div>
    );
};

export default LiquidBackdrop;
