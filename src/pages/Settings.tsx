import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Palette, MonitorPlay, AppWindow, Library, Link2, Cpu, Info, Search, Smartphone,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useSettingsStore } from '../store/settingsStore';
import { useThemeStore, type Appearance, type Mood } from '../store/themeStore';
import { useAmbientStore, AMBIENT_SCENES, type AmbientScene } from '../store/ambientStore';

/* ──────────────────────────── shared bits ──────────────────────────── */

const QueryContext = createContext('');
const matches = (q: string, text: string) => !q || text.toLowerCase().includes(q);

const useGlass = () => useThemeStore(s => s.liquidGlass);

const Group = ({ children }: { children: React.ReactNode }) => {
    const glass = useGlass();
    return (
        <div className={clsx(
            "rounded-[18px] overflow-hidden divide-y divide-on-background/[0.07]",
            glass ? "lg-panel" : "bg-on-background/[0.035] border border-on-background/[0.07]"
        )}>
            {children}
        </div>
    );
};

interface RowProps {
    label: string;
    hint?: React.ReactNode;
    k?: string;
    stack?: boolean;
    children?: React.ReactNode;
}
/** One setting: label on the left, control on the right (or below when `stack`). Hidden when it doesn't match the search. */
const Row = ({ label, hint, k = '', stack, children }: RowProps) => {
    const q = useContext(QueryContext);
    if (!matches(q, `${label} ${k}`)) return null;
    return (
        <div className={clsx("flex gap-5 px-[18px] py-3.5 min-h-[58px]", stack ? "flex-col" : "items-center justify-between flex-wrap sm:flex-nowrap")}>
            <div className="min-w-0 flex flex-col gap-0.5">
                <span className="text-[14px] font-medium text-on-background">{label}</span>
                {hint && <span className="text-[12.5px] text-on-background/50">{hint}</span>}
            </div>
            {children}
        </div>
    );
};

const Switch = ({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) => (
    <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={clsx("relative w-[42px] h-6 rounded-full shrink-0 transition-colors duration-200", on ? "bg-primary" : "bg-on-background/15")}
    >
        <span className={clsx(
            "absolute top-[2px] left-[2px] w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ease-[cubic-bezier(.34,1.56,.64,1)]",
            on && "translate-x-[18px]"
        )} />
    </button>
);

function Seg<T extends string | number>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
    const glass = useGlass();
    return (
        <div className="inline-grid grid-flow-col gap-0.5 p-[3px] rounded-[11px] bg-on-background/[0.06] shrink-0">
            {options.map(o => (
                <button
                    key={String(o.v)}
                    type="button"
                    aria-pressed={o.v === value}
                    onClick={() => onChange(o.v)}
                    className={clsx(
                        "px-3 py-1.5 rounded-lg text-[12.5px] font-medium whitespace-nowrap transition-all",
                        o.v === value
                            ? clsx("text-on-background", glass ? "lg-active" : "bg-background shadow-sm")
                            : "text-on-background/60 hover:text-on-background"
                    )}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

const Btn = ({ children, primary, onClick, disabled }: { children: React.ReactNode; primary?: boolean; onClick?: () => void; disabled?: boolean }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={clsx(
            "inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-[13px] font-medium whitespace-nowrap shrink-0 transition-all active:scale-[0.97] disabled:opacity-50",
            primary ? "bg-primary text-on-primary hover:brightness-110" : "bg-on-background/[0.07] text-on-background hover:bg-on-background/[0.11]"
        )}
    >
        {children}
    </button>
);

const Status = ({ tone, children }: { tone: 'good' | 'warn' | 'off'; children: React.ReactNode }) => (
    <span className="inline-flex items-center gap-1.5">
        <span className={clsx("w-[7px] h-[7px] rounded-full", tone === 'good' ? "bg-green-500" : tone === 'warn' ? "bg-amber-500" : "bg-on-background/30")} />
        {children}
    </span>
);

/** Picture tile used for themes, scenes and widget styles. */
const Tile = ({ active, label, onClick, preview, wide }: { active: boolean; label: string; onClick: () => void; preview: React.ReactNode; wide?: boolean }) => (
    <button type="button" onClick={onClick} aria-pressed={active} className={clsx("group flex flex-col gap-2 text-[12.5px] font-medium text-left", active ? "text-on-background" : "text-on-background/60")}>
        <span className={clsx(
            "relative w-full overflow-hidden rounded-xl transition-all duration-200 group-hover:-translate-y-0.5",
            wide ? "aspect-[16/7]" : "aspect-[16/10]",
            active ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "ring-1 ring-on-background/10"
        )}>
            {preview}
        </span>
        {label}
    </button>
);

const SECTIONS = [
    { id: 'appearance', label: 'Appearance', icon: Palette, k: 'theme light dark oled glass liquid mood colour color interface size zoom scale' },
    { id: 'ambient', label: 'Ambient mode', icon: MonitorPlay, k: 'ambient scene aurora vinyl horizon clock idle screensaver full screen keep screen on' },
    { id: 'widget', label: 'Widget & mini player', icon: AppWindow, k: 'desktop widget style pill card orb always on top mini player resizable' },
    { id: 'remote', label: 'Phone remote', icon: Smartphone, k: 'phone remote control qr code lan wifi mobile' },
    { id: 'library', label: 'Library', icon: Library, k: 'download folder location audio cache clear' },
    { id: 'connections', label: 'Connections', icon: Link2, k: 'youtube api key last.fm lastfm' },
    { id: 'system', label: 'System', icon: Cpu, k: 'hardware acceleration gpu yt-dlp ffmpeg' },
    { id: 'about', label: 'About', icon: Info, k: 'about version license' },
] as const;

interface RemoteInfo { enabled: boolean; running: boolean; url: string; port: number }

/** Phone remote: enable the LAN server, show its QR code/link, rotate the secret link. */
const PhoneRemote = ({ say }: { say: (m: string) => void }) => {
    const [info, setInfo] = useState<RemoteInfo | null>(null);
    const [qr, setQr] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => { window.ipcRenderer.invoke('remote:status').then(setInfo); }, []);
    useEffect(() => {
        if (!info?.url) { setQr(''); return; }
        QRCode.toDataURL(info.url, { margin: 1, width: 360, color: { dark: '#000000', light: '#ffffff' } }).then(setQr).catch(() => setQr(''));
    }, [info?.url]);

    const run = async (fn: () => Promise<RemoteInfo>, msg: string) => {
        setBusy(true);
        try { setInfo(await fn()); say(msg); } finally { setBusy(false); }
    };

    return (
        <Group>
            <Row label="Control from your phone" hint="Scan the code on a phone on the same Wi-Fi. No app needed." k="enable">
                <Switch
                    on={!!info?.enabled}
                    onChange={v => run(() => window.ipcRenderer.invoke('remote:setEnabled', v), v ? 'Phone remote on' : 'Phone remote off')}
                    label="Phone remote"
                />
            </Row>
            {info?.enabled && (
                <Row label="Scan to connect" k="qr link url" stack>
                    {info.running && info.url ? (
                        <div className="flex flex-wrap items-center gap-5">
                            <div className="w-40 h-40 rounded-2xl bg-white p-2 grid place-items-center shrink-0">
                                {qr && <img src={qr} alt="QR code for the phone remote" className="w-full h-full [image-rendering:pixelated]" />}
                            </div>
                            <div className="min-w-0 flex-1 flex flex-col gap-2.5">
                                <span className="font-mono text-[12px] text-on-background/70 break-all select-text">{info.url}</span>
                                <span className="text-[12.5px] text-on-background/50">Anyone with this link on your network can control playback. Reset it to lock out old devices.</span>
                                <div className="flex gap-2">
                                    <Btn onClick={() => { navigator.clipboard.writeText(info.url); say('Link copied'); }}>Copy link</Btn>
                                    <Btn disabled={busy} onClick={() => run(() => window.ipcRenderer.invoke('remote:resetLink'), 'New link created')}>Reset link</Btn>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <Status tone="warn">Couldn't start the remote server. Check your firewall.</Status>
                    )}
                </Row>
            )}
        </Group>
    );
};

const Section = ({ id, title, action, children }: { id: string; title: string; action?: React.ReactNode; children: React.ReactNode }) => {
    const q = useContext(QueryContext);
    const meta = SECTIONS.find(s => s.id === id);
    if (q && !matches(q, `${title} ${meta?.k ?? ''}`)) return null;
    return (
        <section id={`settings-${id}`} data-section={id} className="flex flex-col gap-2.5 scroll-mt-6">
            <header className="flex items-center justify-between gap-3 px-1 min-h-[36px]">
                <h2 className="text-[13px] font-semibold tracking-[0.06em] uppercase text-on-background/60">{title}</h2>
                {action}
            </header>
            {children}
        </section>
    );
};

/* ──────────────────────────── data ──────────────────────────── */

const THEME_TILES: { id: Appearance; label: string; bg: string; panel: string; line: string }[] = [
    { id: 'light', label: 'Light', bg: '#f4f5f7', panel: '#ffffff', line: '#d9dde2' },
    { id: 'dark', label: 'Dark', bg: '#1a1d21', panel: '#2a2e34', line: '#3a3f46' },
    { id: 'oled', label: 'OLED', bg: '#000000', panel: '#15171a', line: '#26292e' },
    { id: 'glass', label: 'Glass', bg: 'linear-gradient(135deg,#7fe3d6,#b9a8ff 55%,#ffb6a3)', panel: 'rgba(255,255,255,.5)', line: 'rgba(255,255,255,.7)' },
];

const MOODS: { id: Mood; label: string; color: string }[] = [
    { id: 'calm', label: 'Calm', color: '#007AFF' },
    { id: 'energetic', label: 'Energetic', color: '#FF9500' },
    { id: 'focus', label: 'Focus', color: '#00C7BE' },
    { id: 'sad', label: 'Sad', color: '#5856D6' },
    { id: 'party', label: 'Party', color: '#FF2D55' },
    { id: 'lucky', label: 'Feeling lucky', color: 'conic-gradient(#ff4d8d,#ffb13d,#4fd8d8,#7a5cff,#ff4d8d)' },
];

const ZOOMS = [0.7, 0.8, 1, 1.1, 1.25, 1.5];

const SCENE_PREVIEW: Record<AmbientScene, string> = {
    aurora: 'radial-gradient(60% 80% at 20% 20%,#ff6a3d,transparent 70%),radial-gradient(60% 80% at 85% 40%,#c2338f,transparent 70%),radial-gradient(60% 80% at 50% 110%,#5b3dff,transparent 70%),#0b0b10',
    vinyl: 'radial-gradient(circle at 26% 50%,#ff6a3d 0 11%,#111 11.5% 13%,#0d0d10 13% 38%,transparent 38.5%),#121216',
    horizon: 'radial-gradient(circle at 50% 62%,#ff9a6b 0 13%,transparent 14%),linear-gradient(180deg,#0b0b10 55%,#3a1f4a 56%,#5b2b5c 70%,#7a2f55 100%)',
    clock: '#000',
};

type WidgetStyle = 'pill' | 'card' | 'orb';

/* ──────────────────────────── page ──────────────────────────── */

const SettingsPage = () => {
    const [query, setQuery] = useState('');
    const [active, setActive] = useState<string>('appearance');
    const [toast, setToast] = useState('');
    const toastTimer = useRef<number>();
    const rootRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const say = useCallback((msg: string) => {
        setToast(msg);
        window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToast(''), 1600);
    }, []);

    // Stores
    const theme = useThemeStore();
    const ambient = useAmbientStore();
    const settings = useSettingsStore();

    // Main-process state
    const [widget, setWidget] = useState<{ enabled: boolean; alwaysOnTop: boolean; style: WidgetStyle }>({ enabled: true, alwaysOnTop: true, style: 'pill' });
    const [gpu, setGpu] = useState<{ current: boolean; next: boolean } | null>(null);
    const [cache, setCache] = useState<{ size: string; count: number } | null>(null);
    const [sys, setSys] = useState<{ ytdlp: { version: string | null; bundled: boolean }; ffmpeg: { version: string | null } } | null>(null);
    const [ytKey, setYtKey] = useState('');
    const [lfmKey, setLfmKey] = useState('');
    const [showYt, setShowYt] = useState(false);
    const [showLfm, setShowLfm] = useState(false);

    useEffect(() => {
        const ipc = window.ipcRenderer;
        useSettingsStore.getState().fetchSettings();
        ipc.invoke('widget:getConfig').then(c => c && setWidget(c));
        ipc.invoke('app:getHardwareAcceleration').then((on: boolean) => setGpu({ current: on, next: on }));
        ipc.invoke('cache:getStats').then(c => c && setCache({ size: c.size, count: c.count }));
        ipc.invoke('system:info').then(setSys).catch(() => { /* older main process */ });
    }, []);

    // API keys: local edit, saved 800 ms after typing stops
    useEffect(() => { setYtKey(settings.youtubeApiKey); }, [settings.youtubeApiKey]);
    useEffect(() => { setLfmKey(settings.lastfmKey); }, [settings.lastfmKey]);
    useEffect(() => {
        if (ytKey === useSettingsStore.getState().youtubeApiKey) return;
        const t = window.setTimeout(() => { useSettingsStore.getState().setYoutubeApiKey(ytKey); say('YouTube key saved'); }, 800);
        return () => window.clearTimeout(t);
    }, [ytKey, say]);
    useEffect(() => {
        if (lfmKey === useSettingsStore.getState().lastfmKey) return;
        const t = window.setTimeout(() => { useSettingsStore.getState().setLastfmKey(lfmKey); say('Last.fm key saved'); }, 800);
        return () => window.clearTimeout(t);
    }, [lfmKey, say]);

    // Ctrl/Cmd+F focuses search
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); searchRef.current?.focus(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Highlight the section in view
    useEffect(() => {
        const scroller = rootRef.current?.closest('.overflow-y-auto') ?? null;
        const io = new IntersectionObserver(entries => {
            entries.forEach(en => { if (en.isIntersecting) setActive((en.target as HTMLElement).dataset.section || 'appearance'); });
        }, { root: scroller, rootMargin: '-15% 0px -70% 0px' });
        rootRef.current?.querySelectorAll('[data-section]').forEach(el => io.observe(el));
        return () => io.disconnect();
    }, [query]);

    const setWidgetValue = async (patch: Partial<typeof widget>) => {
        const ipc = window.ipcRenderer;
        if (patch.enabled !== undefined) await ipc.invoke('widget:setEnabled', patch.enabled);
        if (patch.alwaysOnTop !== undefined) await ipc.invoke('widget:setAlwaysOnTop', patch.alwaysOnTop);
        if (patch.style !== undefined) await ipc.invoke('widget:setStyle', patch.style);
        setWidget(w => ({ ...w, ...patch }));
        say('Saved');
    };

    const q = query.trim().toLowerCase();
    const anyMatch = !q || SECTIONS.some(s => matches(q, `${s.label} ${s.k}`));
    const zoomIndex = Math.max(0, ZOOMS.indexOf(theme.zoomLevel || 1));
    const glass = theme.liquidGlass;

    return (
        <QueryContext.Provider value={q}>
            <motion.div
                ref={rootRef}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-[1040px] mx-auto grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)] gap-6 lg:gap-14 pt-4 pb-32 text-on-background"
            >
                {/* Index */}
                <nav className="lg:sticky lg:top-0 self-start flex lg:flex-col gap-0.5 overflow-x-auto no-scrollbar" aria-label="Settings sections">
                    <h1 className="hidden lg:block text-[22px] font-semibold tracking-tight mb-4 ml-2.5">Settings</h1>
                    {SECTIONS.map(s => {
                        const Icon = s.icon;
                        const on = active === s.id;
                        return (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => rootRef.current?.querySelector(`#settings-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                className={clsx(
                                    "flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] text-[13.5px] font-medium whitespace-nowrap text-left transition-colors",
                                    on ? clsx("text-on-background", glass ? "lg-active" : "bg-on-background/[0.06]") : "text-on-background/60 hover:text-on-background hover:bg-on-background/[0.04]"
                                )}
                            >
                                <Icon size={17} className={clsx("shrink-0 hidden lg:block", on && "text-primary")} />
                                {s.label}
                            </button>
                        );
                    })}
                    <span className="hidden lg:block mt-4 ml-2.5 text-xs font-mono text-on-background/40">v{__APP_VERSION__}</span>
                </nav>

                <div className="min-w-0 flex flex-col gap-10">
                    {/* Search */}
                    <label className={clsx(
                        "relative flex items-center rounded-[14px] transition-shadow focus-within:ring-4 focus-within:ring-primary/15",
                        glass ? "lg-panel" : "bg-on-background/[0.035] border border-on-background/[0.08]"
                    )}>
                        <Search size={17} className="absolute left-3.5 text-on-background/45" />
                        <input
                            ref={searchRef}
                            type="search"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Escape') setQuery(''); }}
                            placeholder="Search settings"
                            className="w-full bg-transparent outline-none pl-11 pr-20 py-3 text-[14px] text-on-background placeholder:text-on-background/40"
                        />
                        <kbd className="absolute right-3 text-[11px] font-mono text-on-background/40 border border-on-background/15 rounded-md px-1.5">Ctrl F</kbd>
                    </label>
                    {!anyMatch && <p className="text-center text-[13px] text-on-background/50 py-10">No settings match “{query}”.</p>}

                    {/* ─── Appearance ─── */}
                    <Section id="appearance" title="Appearance">
                        <Group>
                            <Row label="Theme" k="light dark oled glass appearance" stack>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {THEME_TILES.map(t => (
                                        <Tile
                                            key={t.id}
                                            label={t.label}
                                            active={theme.appearance === t.id}
                                            onClick={() => { theme.setAppearance(t.id); say(`${t.label} theme`); }}
                                            preview={
                                                <span className="absolute inset-0" style={{ background: t.bg }}>
                                                    <i className="absolute left-[8%] top-[12%] bottom-[12%] w-[22%] rounded" style={{ background: t.panel }} />
                                                    <i className="absolute left-[36%] top-[16%] w-[40%] h-[9%] rounded" style={{ background: t.line }} />
                                                    <i className="absolute left-[36%] top-[32%] w-[54%] h-[22%] rounded-md" style={{ background: t.panel }} />
                                                    <i className="absolute left-[36%] right-[8%] bottom-[12%] h-[12%] rounded-full bg-primary" />
                                                </span>
                                            }
                                        />
                                    ))}
                                </div>
                            </Row>
                            <Row label="Liquid Glass" hint="Translucent panels over the album art" k="translucent blur">
                                <Switch on={theme.liquidGlass} onChange={v => { theme.setLiquidGlass(v); say(v ? 'Liquid Glass on' : 'Liquid Glass off'); }} label="Liquid Glass" />
                            </Row>
                            <Row label="Mood colour" hint={theme.currentMood === 'lucky' && theme.luckyTheme ? theme.luckyTheme.name : MOODS.find(m => m.id === theme.currentMood)?.label} k="accent color">
                                <div className="flex flex-wrap gap-2.5">
                                    {MOODS.map(m => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            title={m.id === 'lucky' ? 'Feeling lucky: random colour' : m.label}
                                            aria-label={m.label}
                                            aria-pressed={theme.currentMood === m.id}
                                            onClick={() => { if (m.id === 'lucky') theme.generateLuckyTheme(); else theme.setMood(m.id); say(m.label); }}
                                            className={clsx(
                                                "w-[26px] h-[26px] rounded-full transition-transform hover:scale-110",
                                                theme.currentMood === m.id && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                                            )}
                                            style={{ background: m.color }}
                                        />
                                    ))}
                                </div>
                            </Row>
                            <Row label="Interface size" hint="Scales the whole window" k="zoom scale layout">
                                <div className="flex items-center gap-3.5 w-full sm:w-auto">
                                    <div className="flex flex-col gap-1 w-full sm:w-[300px]">
                                        <input
                                            type="range" min={0} max={ZOOMS.length - 1} step={1} value={zoomIndex}
                                            onChange={e => theme.setZoomLevel(ZOOMS[Number(e.target.value)])}
                                            aria-label="Interface size"
                                            className="w-full accent-[rgb(var(--md-sys-color-primary))]"
                                        />
                                        <div className="flex justify-between text-[11px] text-on-background/45"><span>Compact</span><span>Default</span><span>Large</span></div>
                                    </div>
                                    <span className="font-mono text-[12.5px] text-on-background/60 tabular-nums w-11 text-right">{Math.round(ZOOMS[zoomIndex] * 100)}%</span>
                                </div>
                            </Row>
                        </Group>
                    </Section>

                    {/* ─── Ambient ─── */}
                    <Section id="ambient" title="Ambient mode" action={<Btn primary onClick={() => ambient.open()}><MonitorPlay size={15} /> Open now</Btn>}>
                        <Group>
                            <Row label="Scene" hint="Full-screen lyrics and a slow background" k="aurora vinyl horizon clock" stack>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    {AMBIENT_SCENES.map(s => (
                                        <Tile
                                            key={s}
                                            label={s[0].toUpperCase() + s.slice(1)}
                                            active={ambient.scene === s}
                                            onClick={() => { ambient.set({ scene: s }); say('Saved'); }}
                                            preview={
                                                <span className="absolute inset-0 grid place-items-center font-mono text-[15px] text-white/90" style={{ background: SCENE_PREVIEW[s] }}>
                                                    {s === 'clock' ? '21:48' : null}
                                                </span>
                                            }
                                        />
                                    ))}
                                </div>
                            </Row>
                            <Row label="Start when idle" hint="Only while music is playing" k="screensaver automatically">
                                <Seg value={ambient.idleMinutes} onChange={v => { ambient.set({ idleMinutes: v }); say('Saved'); }}
                                    options={[{ v: 0, label: 'Never' }, { v: 2, label: '2 m' }, { v: 5, label: '5 m' }, { v: 10, label: '10 m' }, { v: 20, label: '20 m' }]} />
                            </Row>
                            <Row label="Open in full screen" k="fullscreen">
                                <Switch on={ambient.fullScreen} onChange={v => ambient.set({ fullScreen: v })} label="Open in full screen" />
                            </Row>
                            <Row label="Keep screen on" hint="While ambient mode shows playing music" k="awake sleep display">
                                <Switch on={ambient.keepAwake} onChange={v => ambient.set({ keepAwake: v })} label="Keep screen on" />
                            </Row>
                        </Group>
                    </Section>

                    {/* ─── Widget & mini player ─── */}
                    <Section id="widget" title="Widget & mini player" action={<Btn onClick={() => window.ipcRenderer.invoke('widget:preview')}>Show widget</Btn>}>
                        <Group>
                            <Row label="Desktop widget" hint="Appears when the app is minimized" k="minimize taskbar">
                                <Switch on={widget.enabled} onChange={v => setWidgetValue({ enabled: v })} label="Desktop widget" />
                            </Row>
                            <Row label="Widget style" k="pill card orb" stack>
                                <div className="grid grid-cols-3 gap-2.5">
                                    {(['pill', 'card', 'orb'] as WidgetStyle[]).map(st => (
                                        <Tile
                                            key={st}
                                            wide
                                            label={st[0].toUpperCase() + st.slice(1)}
                                            active={widget.style === st}
                                            onClick={() => setWidgetValue({ style: st })}
                                            preview={
                                                <span className="absolute inset-0 grid place-items-center bg-gradient-to-br from-primary/30 to-on-background/5">
                                                    <i className={clsx(
                                                        "bg-background shadow-lg",
                                                        st === 'pill' && "w-[56%] h-[30%] rounded-full",
                                                        st === 'card' && "w-[20%] h-[78%] rounded-lg",
                                                        st === 'orb' && "w-[22%] aspect-square rounded-full ring-[3px] ring-primary"
                                                    )} />
                                                </span>
                                            }
                                        />
                                    ))}
                                </div>
                            </Row>
                            <Row label="Always on top" hint="Keeps the widget above other windows" k="pin">
                                <Switch on={widget.alwaysOnTop} onChange={v => setWidgetValue({ alwaysOnTop: v })} label="Always on top" />
                            </Row>
                            <Row label="Resizable mini player" hint="Keeps its 380 × 712 proportions" k="aspect ratio">
                                <Switch on={settings.isMiniPlayerResizable} onChange={v => { settings.setMiniPlayerResizable(v); say('Saved'); }} label="Resizable mini player" />
                            </Row>
                        </Group>
                    </Section>

                    {/* ─── Phone remote ─── */}
                    <Section id="remote" title="Phone remote">
                        <PhoneRemote say={say} />
                    </Section>

                    {/* ─── Library ─── */}
                    <Section id="library" title="Library">
                        <Group>
                            <Row label="Download folder" hint={<span className="font-mono truncate block max-w-[360px]" title={settings.downloadPath}>{settings.downloadPath || 'App data folder (default)'}</span>} k="location path">
                                <Btn onClick={async () => {
                                    const path = await window.ipcRenderer.invoke('dialog:openDirectory');
                                    if (path) { await settings.setDownloadPath(path); say('Download folder changed'); }
                                }}>Change…</Btn>
                            </Row>
                            <Row label="Audio cache" hint={cache ? `${cache.size} MB · ${cache.count} songs streamed recently` : 'Checking…'} k="storage clear">
                                <Btn disabled={!cache || cache.count === 0} onClick={async () => {
                                    await window.ipcRenderer.invoke('cache:clear');
                                    setCache({ size: '0.00', count: 0 });
                                    say('Cache cleared');
                                }}>Clear</Btn>
                            </Row>
                        </Group>
                    </Section>

                    {/* ─── Connections ─── */}
                    <Section id="connections" title="Connections" action={<span className="text-[12.5px] text-on-background/45">Keys stay on this computer</span>}>
                        <Group>
                            {([
                                { label: 'YouTube Data API', k: 'youtube key', value: ytKey, set: setYtKey, show: showYt, setShow: setShowYt, hint: 'Faster search and trending. Optional.' },
                                { label: 'Last.fm', k: 'lastfm last.fm key scrobble', value: lfmKey, set: setLfmKey, show: showLfm, setShow: setShowLfm, hint: 'Charts and artist info.' },
                            ]).map(f => (
                                <Row key={f.label} label={f.label} k={f.k} hint={<Status tone={f.value ? 'good' : 'off'}>{f.value ? 'Key set' : `Not set · ${f.hint}`}</Status>}>
                                    <div className="flex items-center gap-2 w-full sm:w-[340px] pl-3 pr-1.5 py-1.5 rounded-[11px] bg-on-background/[0.06]">
                                        <input
                                            type={f.show ? 'text' : 'password'}
                                            value={f.value}
                                            onChange={e => f.set(e.target.value)}
                                            placeholder="Paste API key"
                                            spellCheck={false}
                                            aria-label={`${f.label} key`}
                                            className="flex-1 min-w-0 bg-transparent outline-none font-mono text-[12.5px] text-on-background placeholder:text-on-background/35"
                                        />
                                        <button type="button" onClick={() => f.setShow(!f.show)} className="px-2 py-1 rounded-md text-xs text-on-background/60 hover:text-on-background hover:bg-on-background/[0.08]">
                                            {f.show ? 'Hide' : 'Show'}
                                        </button>
                                    </div>
                                </Row>
                            ))}
                        </Group>
                    </Section>

                    {/* ─── System ─── */}
                    <Section id="system" title="System">
                        <AnimatePresence>
                            {gpu && gpu.next !== gpu.current && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                                    className="flex items-center gap-3 px-4 py-3 rounded-[14px] text-[13px] bg-amber-500/15 text-on-background"
                                    role="status"
                                >
                                    Restart AT Music Pro to apply the graphics change.
                                    <span className="ml-auto"><Btn onClick={() => window.ipcRenderer.invoke('app:relaunch')}>Restart now</Btn></span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <Group>
                            <Row label="Hardware acceleration" hint="Smoother animations. Turn off if the window stays blank." k="gpu graphics">
                                {gpu && <Switch on={gpu.next} onChange={async v => { await window.ipcRenderer.invoke('app:setHardwareAcceleration', v); setGpu(g => g && { ...g, next: v }); }} label="Hardware acceleration" />}
                            </Row>
                            <Row label="yt-dlp" k="youtube engine" hint={
                                !sys ? 'Checking…'
                                    : sys.ytdlp.version ? <Status tone="good">{sys.ytdlp.version}{sys.ytdlp.bundled ? ' · bundled' : ' · system'}</Status>
                                        : <Status tone="warn">Not found · YouTube search and streaming won't work</Status>
                            } />
                            <Row label="ffmpeg" k="video" hint={
                                !sys ? 'Checking…'
                                    : sys.ffmpeg.version ? <Status tone="good">{sys.ffmpeg.version}</Status>
                                        : <Status tone="warn">Not found · video mode uses pre-merged streams only</Status>
                            } />
                        </Group>
                    </Section>

                    {/* ─── About ─── */}
                    <Section id="about" title="About">
                        <Group>
                            <div className="flex flex-wrap items-center gap-4 px-[18px] py-5">
                                <img src="./app_icon.png" alt="" className="w-16 h-16 object-contain drop-shadow-md" />
                                <div className="min-w-0">
                                    <h3 className="text-[17px] font-semibold">AT Music Pro</h3>
                                    <p className="text-[12.5px] text-on-background/50">
                                        Version {__APP_VERSION__} · MIT License · Designed by{' '}
                                        <a href="https://atishaksharma.com" target="_blank" rel="noreferrer" className="text-primary hover:underline">Atish Ak Sharma</a>
                                    </p>
                                </div>
                                <div className="flex gap-1 sm:ml-auto">
                                    <a href="https://github.com/atishsharma/AT-Music-Player/releases" target="_blank" rel="noreferrer" className="px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-primary hover:bg-on-background/[0.06]">Release notes</a>
                                    <a href="https://github.com/atishsharma/AT-Music-Player" target="_blank" rel="noreferrer" className="px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-primary hover:bg-on-background/[0.06]">GitHub</a>
                                </div>
                            </div>
                        </Group>
                    </Section>
                </div>
            </motion.div>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 12, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 12, x: '-50%' }}
                        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                        className="fixed left-1/2 bottom-32 z-[300] px-4 py-2 rounded-full bg-on-background text-background text-[13px] font-medium shadow-xl pointer-events-none"
                        role="status"
                    >
                        {toast}
                    </motion.div>
                )}
            </AnimatePresence>
        </QueryContext.Provider>
    );
};

export default SettingsPage;
