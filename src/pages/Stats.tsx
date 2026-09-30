import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { BarChart3, Clock, Disc3, Flame, Music2, Play, Sparkles, Users, X, Download, Copy } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { useThemeStore } from '../store/themeStore';
import { toAtmusicUrl } from '../utils/path';
import { drawRecap } from '../components/stats/recap';
import type { Track } from '../types/library';

type Range = 'week' | 'month' | 'year' | 'all' | `y${number}`;

interface Row { title: string; artist: string; image_path?: string; plays: number; minutes: number; video_id?: string; track_id?: number; path?: string; source?: string; duration?: number; album?: string }
interface Stats {
    totals: { plays: number; minutes: number; songs: number; artists: number; first: string | null };
    topTracks: Row[];
    topArtists: { name: string; image_path?: string; plays: number; minutes: number }[];
    topAlbums: { title: string; artist: string; image_path?: string; plays: number }[];
    hours: number[];
    weekdays: number[];
    daily: { day: string; minutes: number }[];
    streak: { best: number; current: number };
    years: number[];
}

const RANGES: { v: Range; label: string }[] = [
    { v: 'week', label: '7 days' },
    { v: 'month', label: '30 days' },
    { v: 'year', label: '12 months' },
    { v: 'all', label: 'All time' },
];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const hourLabel = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? 'a' : 'p'}`;
const fmtMin = (m: number) => (m >= 600 ? `${Math.round(m / 60).toLocaleString()} h` : `${Math.round(m).toLocaleString()} min`);

const toTrack = (r: Row): Track => ({
    id: r.track_id ?? r.video_id ?? r.title,
    title: r.title,
    artist: r.artist,
    album: r.album || '',
    duration: r.duration || 0,
    path: r.path || '',
    format: '',
    image_path: r.image_path,
    source: (r.source as Track['source']) || 'local',
    video_id: r.video_id,
});

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    const glass = useThemeStore(s => s.liquidGlass);
    return (
        <div className={clsx("rounded-[22px] p-5 text-on-background", glass ? "lg-panel" : "bg-on-background/[0.035] border border-on-background/[0.07]", className)}>
            {children}
        </div>
    );
};

const Art = ({ src, round, className }: { src?: string; round?: boolean; className?: string }) => (
    <div className={clsx("bg-on-background/10 overflow-hidden shrink-0 grid place-items-center", round ? "rounded-full" : "rounded-xl", className)}>
        {src ? <img src={toAtmusicUrl(src)} alt="" loading="lazy" className="w-full h-full object-cover" /> : <Music2 size={16} className="text-on-background/30" />}
    </div>
);

/** Weeks × weekdays grid of minutes listened (GitHub-style) */
const Heatmap = ({ daily }: { daily: Stats['daily'] }) => {
    const { cells, max } = useMemo(() => {
        const map = new Map(daily.map(d => [d.day, d.minutes]));
        const today = new Date();
        const start = new Date(today);
        start.setDate(start.getDate() - 7 * 52 - today.getDay());
        const out: { day: string; m: number }[] = [];
        for (const d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
            const key = d.toLocaleDateString('en-CA');
            out.push({ day: key, m: map.get(key) || 0 });
        }
        return { cells: out, max: Math.max(1, ...out.map(c => c.m)) };
    }, [daily]);
    return (
        <div className="overflow-x-auto no-scrollbar">
            <div className="grid grid-rows-7 grid-flow-col gap-[3px] w-max">
                {cells.map(c => (
                    <div
                        key={c.day}
                        title={`${c.day}: ${Math.round(c.m)} min`}
                        className="w-[11px] h-[11px] rounded-[3px]"
                        style={{ background: c.m ? `rgb(var(--md-sys-color-primary) / ${0.2 + 0.8 * Math.min(1, c.m / max)})` : 'rgb(var(--md-sys-color-on-background) / 0.07)' }}
                    />
                ))}
            </div>
        </div>
    );
};

const Bars = ({ values, labels, highlight }: { values: number[]; labels: (i: number) => string; highlight?: number }) => {
    const max = Math.max(1, ...values);
    return (
        <div className="flex items-end gap-[3px] h-32">
            {values.map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group" title={`${labels(i)}: ${Math.round(v)} min`}>
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(3, (v / max) * 100)}%` }}
                        transition={{ type: 'spring', damping: 22, stiffness: 180, delay: i * 0.01 }}
                        className={clsx("w-full rounded-md", i === highlight ? "bg-primary" : "bg-primary/35 group-hover:bg-primary/60")}
                    />
                    {(values.length <= 7 || i % 3 === 0) && <span className="text-[10px] text-on-background/45">{labels(i)}</span>}
                </div>
            ))}
        </div>
    );
};

const RecapModal = ({ year, onClose }: { year: number; onClose: () => void }) => {
    const [img, setImg] = useState('');
    const [note, setNote] = useState('');
    useEffect(() => {
        let alive = true;
        (async () => {
            const s: Stats = await window.ipcRenderer.invoke('stats:get', `y${year}`);
            const accent = getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-primary').trim() || '139 124 255';
            const url = await drawRecap({
                year,
                minutes: s.totals.minutes || 0,
                plays: s.totals.plays || 0,
                songs: s.totals.songs || 0,
                artists: s.totals.artists || 0,
                bestStreak: s.streak.best,
                topTracks: s.topTracks,
                topArtists: s.topArtists,
                peakHour: s.hours.indexOf(Math.max(...s.hours)),
            }, accent);
            if (alive) setImg(url);
        })();
        return () => { alive = false; };
    }, [year]);

    const save = async () => {
        const path = await window.ipcRenderer.invoke('file:savePng', { dataUrl: img, name: `AT Music ${year} recap.png` });
        if (path) setNote('Saved');
    };
    const copy = async () => {
        try {
            const blob = await (await fetch(img)).blob();
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            setNote('Copied to clipboard');
        } catch { setNote("Couldn't copy"); }
    };

    // Portal: the page's own transform would otherwise trap this `fixed` overlay
    return createPortal(
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-md grid place-items-center p-6" onClick={onClose}>
            <motion.div initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 20 }}
                className="flex flex-col items-center gap-4 max-h-full" onClick={e => e.stopPropagation()}>
                <div className="relative h-[min(72vh,760px)] aspect-[9/16] rounded-[26px] overflow-hidden bg-white/5 shadow-2xl">
                    {img ? <img src={img} alt={`${year} listening recap`} className="w-full h-full" />
                        : <div className="w-full h-full grid place-items-center text-white/60 text-sm">Making your recap…</div>}
                </div>
                <div className="flex items-center gap-2">
                    <button disabled={!img} onClick={save} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold disabled:opacity-40"><Download size={16} /> Save image</button>
                    <button disabled={!img} onClick={copy} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/15 text-white text-sm font-semibold disabled:opacity-40"><Copy size={16} /> Copy</button>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/15 text-white grid place-items-center" aria-label="Close"><X size={18} /></button>
                </div>
                {note && <span className="text-white/70 text-xs">{note}</span>}
            </motion.div>
        </motion.div>,
        document.body
    );
};

const StatsPage = () => {
    const [range, setRange] = useState<Range>('month');
    const [stats, setStats] = useState<Stats | null>(null);
    const [recapYear, setRecapYear] = useState<number | null>(null);
    const play = usePlayerStore(s => s.play);
    const setQueue = usePlayerStore(s => s.setQueue);

    useEffect(() => {
        let alive = true;
        window.ipcRenderer.invoke('stats:get', range).then((s: Stats) => { if (alive) setStats(s); });
        return () => { alive = false; };
    }, [range]);

    const t = stats?.totals;
    const peakHour = stats ? stats.hours.indexOf(Math.max(...stats.hours)) : -1;
    const peakDay = stats ? stats.weekdays.indexOf(Math.max(...stats.weekdays)) : -1;
    const empty = stats && !t?.plays;
    const years = stats?.years ?? [];

    const playTop = (i: number) => {
        if (!stats) return;
        const tracks = stats.topTracks.map(toTrack);
        setQueue(tracks.slice(i + 1));
        play(tracks[i]);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="p-8 pt-12 space-y-6 text-on-background">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-[1.4rem] bg-primary/10 text-primary grid place-items-center"><BarChart3 size={28} /></div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter text-primary">Your listening</h1>
                        <p className="text-on-background/55 text-sm">{t?.first ? `Since ${new Date(t.first.replace(' ', 'T') + 'Z').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}` : 'Play some music to see your stats'}</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex p-1 rounded-full bg-on-background/[0.06]">
                        {[...RANGES, ...years.map(y => ({ v: `y${y}` as Range, label: String(y) }))].map(r => (
                            <button key={r.v} onClick={() => setRange(r.v)}
                                className={clsx("px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors",
                                    range === r.v ? "bg-primary text-on-primary" : "text-on-background/60 hover:text-on-background")}>
                                {r.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setRecapYear(range.startsWith('y') ? Number(range.slice(1)) : (years[0] ?? new Date().getFullYear()))}
                        disabled={!years.length}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-on-primary text-[13px] font-semibold disabled:opacity-40 hover:brightness-110"
                    >
                        <Sparkles size={15} /> {range.startsWith('y') ? range.slice(1) : years[0] ?? ''} recap
                    </button>
                </div>
            </div>

            {empty ? (
                <Card className="py-20 text-center">
                    <BarChart3 size={44} className="mx-auto mb-3 text-on-background/20" />
                    <p className="font-semibold">Nothing played in this period</p>
                    <p className="text-sm text-on-background/50">Stats build up as you listen.</p>
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { icon: Clock, v: t ? fmtMin(t.minutes || 0) : '—', l: 'listened' },
                            { icon: Play, v: t?.plays?.toLocaleString() ?? '—', l: 'plays' },
                            { icon: Disc3, v: t?.songs?.toLocaleString() ?? '—', l: 'different songs' },
                            { icon: Flame, v: stats ? `${stats.streak.best} days` : '—', l: stats?.streak.current ? `best streak · ${stats.streak.current} now` : 'best streak' },
                        ].map(c => (
                            <Card key={c.l}>
                                <c.icon size={18} className="text-primary mb-3" />
                                <div className="text-3xl font-black tracking-tight tabular-nums">{c.v}</div>
                                <div className="text-[13px] text-on-background/55">{c.l}</div>
                            </Card>
                        ))}
                    </div>

                    <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
                        <Card>
                            <h2 className="font-bold mb-3 flex items-center gap-2"><Music2 size={17} className="text-primary" /> Top songs</h2>
                            <div className="space-y-0.5">
                                {stats?.topTracks.map((r, i) => (
                                    <button key={r.title + r.artist} onClick={() => playTop(i)}
                                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-primary/10 text-left group">
                                        <span className="w-5 text-right text-sm font-black text-on-background/40 group-hover:text-primary tabular-nums">{i + 1}</span>
                                        <Art src={r.image_path} className="w-10 h-10" />
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold truncate group-hover:text-primary">{r.title}</p>
                                            <p className="text-xs text-on-background/55 truncate">{r.artist}</p>
                                        </div>
                                        <span className="text-xs text-on-background/50 tabular-nums">{r.plays} plays</span>
                                    </button>
                                ))}
                            </div>
                        </Card>
                        <Card>
                            <h2 className="font-bold mb-3 flex items-center gap-2"><Users size={17} className="text-primary" /> Top artists</h2>
                            <div className="space-y-1">
                                {stats?.topArtists.slice(0, 8).map((a, i) => {
                                    const max = stats.topArtists[0]?.minutes || 1;
                                    return (
                                        <div key={a.name} className="flex items-center gap-3 p-1.5">
                                            <Art src={a.image_path} round className="w-9 h-9" />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex justify-between gap-2 text-sm">
                                                    <span className="font-semibold truncate">{i + 1}. {a.name}</span>
                                                    <span className="text-on-background/50 tabular-nums shrink-0">{fmtMin(a.minutes)}</span>
                                                </div>
                                                <div className="h-1.5 mt-1 rounded-full bg-on-background/[0.07] overflow-hidden">
                                                    <motion.div initial={{ width: 0 }} animate={{ width: `${(a.minutes / max) * 100}%` }} className="h-full rounded-full bg-primary" />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-4">
                        <Card>
                            <h2 className="font-bold">Time of day</h2>
                            <p className="text-[13px] text-on-background/55 mb-4">{peakHour >= 0 ? `You listen most around ${hourLabel(peakHour)}m` : ''}</p>
                            {stats && <Bars values={stats.hours} labels={hourLabel} highlight={peakHour} />}
                        </Card>
                        <Card>
                            <h2 className="font-bold">Day of week</h2>
                            <p className="text-[13px] text-on-background/55 mb-4">{peakDay >= 0 ? `${DAYS[peakDay]}s are your biggest music day` : ''}</p>
                            {stats && <Bars values={stats.weekdays} labels={i => DAYS[i]} highlight={peakDay} />}
                        </Card>
                    </div>

                    {stats && !!stats.topAlbums.length && (
                        <Card>
                            <h2 className="font-bold mb-3">Top albums</h2>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                                {stats.topAlbums.map(a => (
                                    <div key={a.title} className="min-w-0">
                                        <Art src={a.image_path} className="w-full aspect-square !rounded-2xl mb-2" />
                                        <p className="text-sm font-semibold truncate">{a.title}</p>
                                        <p className="text-xs text-on-background/55 truncate">{a.plays} plays</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    <Card>
                        <h2 className="font-bold mb-3">Activity</h2>
                        {stats && <Heatmap daily={stats.daily} />}
                    </Card>
                </>
            )}

            <AnimatePresence>{recapYear && <RecapModal year={recapYear} onClose={() => setRecapYear(null)} />}</AnimatePresence>
        </motion.div>
    );
};

export default StatsPage;
