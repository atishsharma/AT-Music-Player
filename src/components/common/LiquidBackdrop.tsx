import { useEffect, useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { toAtmusicUrl } from '../../utils/path';
import { sampleColor } from '../../utils/artPalette';

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
