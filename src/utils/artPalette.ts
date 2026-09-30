export type RGB = [number, number, number];

const toTriplet = ([r, g, b]: RGB) => `${r} ${g} ${b}`;

function loadPixels(src: string, size: number): Promise<Uint8ClampedArray | null> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = canvas.height = size;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (!ctx) return resolve(null);
                ctx.drawImage(img, 0, 0, size, size);
                resolve(ctx.getImageData(0, 0, size, size).data);
            } catch {
                resolve(null); // tainted canvas (remote image without CORS)
            }
        };
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

// Near-black / near-white pixels wash colours out; skip them
const usable = (d: Uint8ClampedArray, i: number) => {
    const max = Math.max(d[i], d[i + 1], d[i + 2]);
    const min = Math.min(d[i], d[i + 1], d[i + 2]);
    return max >= 24 && min <= 235;
};

/** Average colour of an image as an "R G B" triplet, or null if it can't be read. */
export async function sampleColor(src: string): Promise<string | null> {
    const d = await loadPixels(src, 12);
    if (!d) return null;
    const sum: RGB = [0, 0, 0];
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
        if (!usable(d, i)) continue;
        sum[0] += d[i]; sum[1] += d[i + 1]; sum[2] += d[i + 2]; n++;
    }
    return n ? toTriplet(sum.map(v => Math.round(v / n)) as RGB) : null;
}

/**
 * Three representative colours of an image ("R G B" triplets), most saturated first.
 * Buckets pixels by hue and keeps the three most populated buckets.
 */
export async function samplePalette(src: string): Promise<[string, string, string] | null> {
    const d = await loadPixels(src, 24);
    if (!d) return null;
    const buckets = new Map<number, { sum: RGB; n: number; sat: number }>();
    for (let i = 0; i < d.length; i += 4) {
        if (!usable(d, i)) continue;
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const sat = max ? (max - min) / max : 0;
        let h = 0;
        if (max !== min) {
            if (max === r) h = ((g - b) / (max - min)) % 6;
            else if (max === g) h = (b - r) / (max - min) + 2;
            else h = (r - g) / (max - min) + 4;
        }
        const key = sat < 0.15 ? -1 : Math.round(((h * 60 + 360) % 360) / 30); // 12 hue buckets + greys
        const bk = buckets.get(key) ?? { sum: [0, 0, 0] as RGB, n: 0, sat: 0 };
        bk.sum[0] += r; bk.sum[1] += g; bk.sum[2] += b; bk.n++; bk.sat += sat;
        buckets.set(key, bk);
    }
    const ranked = [...buckets.values()]
        .sort((a, b) => b.n - a.n)
        .slice(0, 3)
        .sort((a, b) => b.sat / b.n - a.sat / a.n)
        .map(bk => toTriplet(bk.sum.map(v => Math.round(v / bk.n)) as RGB));
    if (!ranked.length) return null;
    while (ranked.length < 3) ranked.push(ranked[ranked.length - 1]);
    return ranked as [string, string, string];
}
