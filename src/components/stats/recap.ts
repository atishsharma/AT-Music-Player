import { toAtmusicUrl } from '../../utils/path';

export interface RecapData {
    year: number;
    minutes: number;
    plays: number;
    songs: number;
    artists: number;
    bestStreak: number;
    topTracks: { title: string; artist: string; image_path?: string }[];
    topArtists: { name: string; image_path?: string; minutes: number }[];
    peakHour: number;
}

const W = 1080, H = 1920;

function loadImage(src: string): Promise<HTMLImageElement | null> {
    if (!src) return Promise.resolve(null);
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // images without CORS fail to load instead of tainting the canvas
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = toAtmusicUrl(src);
    });
}

function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
    const s = Math.max(w / img.width, h / img.height);
    const sw = w / s, sh = h / s;
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
}

function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
    if (ctx.measureText(text).width <= max) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
    return t + '…';
}

const hourLabel = (h: number) => `${((h + 11) % 12) + 1} ${h < 12 ? 'AM' : 'PM'}`;

/** Draws the 1080×1920 shareable recap card; returns a PNG data URL */
export async function drawRecap(data: RecapData, accent: string): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const [r, g, b] = accent.split(' ').map(Number);
    const acc = (a = 1) => `rgba(${r},${g},${b},${a})`;

    // Background: deep base + two accent glows
    ctx.fillStyle = '#0c0b12';
    ctx.fillRect(0, 0, W, H);
    const glow = (x: number, y: number, rad: number, a: number) => {
        const gr = ctx.createRadialGradient(x, y, 0, x, y, rad);
        gr.addColorStop(0, acc(a));
        gr.addColorStop(1, acc(0));
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, W, H);
    };
    glow(W * 0.85, 180, 900, 0.55);
    glow(80, H * 0.75, 800, 0.3);

    const font = (weight: number, size: number) => `${weight} ${size}px Inter, "Segoe UI", system-ui, sans-serif`;
    ctx.textBaseline = 'alphabetic';
    const P = 84;

    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.font = font(600, 34);
    ctx.fillText('AT MUSIC · YEAR IN MUSIC', P, 150);
    ctx.fillStyle = '#fff';
    ctx.font = font(900, 210);
    ctx.fillText(String(data.year), P - 8, 350);

    // Minutes
    ctx.font = font(800, 150);
    ctx.fillStyle = '#fff';
    const mins = data.minutes.toLocaleString();
    ctx.fillText(mins, P, 560);
    const mw = ctx.measureText(mins).width;
    ctx.font = font(600, 44);
    ctx.fillStyle = acc();
    ctx.fillText('minutes', P + mw + 24, 560);
    ctx.fillStyle = 'rgba(255,255,255,.65)';
    ctx.font = font(500, 36);
    ctx.fillText(`That's ${(data.minutes / 60).toFixed(0)} hours of music.`, P, 620);

    // Top artist hero
    const topArtist = data.topArtists[0];
    let y = 700;
    if (topArtist) {
        const img = await loadImage(topArtist.image_path || '');
        const size = 220;
        ctx.save();
        ctx.beginPath();
        ctx.arc(P + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
        if (img) cover(ctx, img, P, y, size, size);
        else { ctx.fillStyle = acc(0.5); ctx.fillRect(P, y, size, size); }
        ctx.restore();
        ctx.fillStyle = 'rgba(255,255,255,.65)';
        ctx.font = font(600, 32);
        ctx.fillText('TOP ARTIST', P + size + 48, y + 80);
        ctx.fillStyle = '#fff';
        ctx.font = font(800, 64);
        ctx.fillText(fit(ctx, topArtist.name, W - P * 2 - size - 48), P + size + 48, y + 150);
        ctx.fillStyle = acc();
        ctx.font = font(600, 34);
        ctx.fillText(`${topArtist.minutes.toLocaleString()} minutes`, P + size + 48, y + 198);
        y += size + 70;
    }

    // Top songs
    ctx.fillStyle = 'rgba(255,255,255,.65)';
    ctx.font = font(600, 32);
    ctx.fillText('TOP SONGS', P, y);
    y += 30;
    const tracks = data.topTracks.slice(0, 5);
    const imgs = await Promise.all(tracks.map(t => loadImage(t.image_path || '')));
    tracks.forEach((t, i) => {
        const rowY = y + i * 112;
        ctx.fillStyle = acc();
        ctx.font = font(800, 44);
        ctx.fillText(String(i + 1), P, rowY + 72);
        const ax = P + 64;
        ctx.save();
        roundRect(ctx, ax, rowY + 12, 96, 96, 18);
        ctx.clip();
        if (imgs[i]) cover(ctx, imgs[i]!, ax, rowY + 12, 96, 96);
        else { ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(ax, rowY + 12, 96, 96); }
        ctx.restore();
        ctx.fillStyle = '#fff';
        ctx.font = font(700, 40);
        ctx.fillText(fit(ctx, t.title, W - ax - 130 - P), ax + 124, rowY + 56);
        ctx.fillStyle = 'rgba(255,255,255,.6)';
        ctx.font = font(500, 32);
        ctx.fillText(fit(ctx, t.artist || '', W - ax - 130 - P), ax + 124, rowY + 98);
    });
    y += Math.max(1, tracks.length) * 112 + 40;

    // Stat tiles
    const tiles: [string, string][] = [
        [data.plays.toLocaleString(), 'plays'],
        [data.songs.toLocaleString(), 'songs'],
        [data.artists.toLocaleString(), 'artists'],
        [`${data.bestStreak}d`, 'best streak'],
    ];
    const gap = 24, tw = (W - P * 2 - gap * 3) / 4, th = 150;
    tiles.forEach(([v, l], i) => {
        const tx = P + i * (tw + gap);
        const ty = y;
        ctx.fillStyle = 'rgba(255,255,255,.07)';
        roundRect(ctx, tx, ty, tw, th, 32);
        ctx.fill();
        ctx.fillStyle = '#fff';
        let size = 54;
        do { ctx.font = font(800, size); size -= 2; } while (size > 30 && ctx.measureText(v).width > tw - 48);
        ctx.fillText(v, tx + 28, ty + 82);
        ctx.fillStyle = 'rgba(255,255,255,.6)';
        ctx.font = font(500, 28);
        ctx.fillText(l, tx + 28, ty + 122);
    });

    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.font = font(500, 32);
    ctx.fillText(`Most of your listening happened around ${hourLabel(data.peakHour)}.`, P, H - 80);

    return canvas.toDataURL('image/png');
}
