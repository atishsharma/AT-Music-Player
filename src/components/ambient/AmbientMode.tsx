import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Pause, Play, Settings2, SkipBack, SkipForward, X } from 'lucide-react';
import clsx from 'clsx';
import { usePlayerStore } from '../../store/playerStore';
import { AMBIENT_SCENES, AMBIENT_STYLES, AmbientScene, SleepTimer, useAmbientStore } from '../../store/ambientStore';
import { toAtmusicUrl } from '../../utils/path';
import { samplePalette } from '../../utils/artPalette';
import HorizonWaves from './HorizonWaves';
import './ambient.css';

interface Line {
    t: number;
    text: string | null; // null = instrumental break
}

const SCENE_LABEL: Record<AmbientScene, string> = { aurora: 'Aurora', vinyl: 'Vinyl', horizon: 'Horizon', clock: 'Clock' };
const DEFAULT_PALETTE: [string, string, string] = ['255 106 61', '194 51 143', '91 61 255'];

const fmt = (s: number) => {
    const v = Math.max(0, s || 0);
    return `${Math.floor(v / 60)}:${Math.floor(v % 60).toString().padStart(2, '0')}`;
};

/** Synced LRC lines plus instrumental markers for the intro and long gaps. */
function buildLines(synced: { seconds: number; content: string }[] | undefined): Line[] {
    if (!Array.isArray(synced) || synced.length === 0) return [];
    const out: Line[] = [];
    if (synced[0].seconds > 5) out.push({ t: 0, text: null });
    synced.forEach((l, i) => {
        out.push({ t: l.seconds, text: l.content });
        const next = synced[i + 1];
        // Treat a long silence after a line as an instrumental break
        if (next && next.seconds - l.seconds > 14) out.push({ t: l.seconds + 7, text: null });
    });
    return out;
}

function findLine(lines: Line[], t: number) {
    let lo = 0, hi = lines.length - 1, found = 0;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (lines[mid].t <= t) { found = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return found;
}

const AmbientMode = () => {
    const amb = useAmbientStore();
    const { currentTrack, isPlaying, duration, lyrics, queue, play, pause, next, prev, seek } = usePlayerStore(useShallow(s => ({
        currentTrack: s.currentTrack, isPlaying: s.isPlaying, duration: s.duration, lyrics: s.lyrics, queue: s.queue,
        play: s.play, pause: s.pause, next: s.next, prev: s.prev, seek: s.seek,
    })));

    const rootRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const plainRef = useRef<HTMLDivElement>(null);
    const fillRef = useRef<HTMLElement>(null);
    const curRef = useRef<HTMLSpanElement>(null);
    const [activeIdx, setActiveIdx] = useState(-1);
    const [idle, setIdle] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [showUpNext, setShowUpNext] = useState(false);
    const [now, setNow] = useState(() => new Date());
    const [shift, setShift] = useState(0);
    const [palette, setPalette] = useState(DEFAULT_PALETTE);

    const art = toAtmusicUrl(currentTrack?.image_path || currentTrack?.thumbnail || '');
    const upNext = queue[0];
    const upNextArt = toAtmusicUrl(upNext?.image_path || upNext?.thumbnail || '');
    const lines = useMemo(() => buildLines(lyrics?.syncedLyrics), [lyrics]);
    const hasSynced = lines.length > 0;

    // ─── Playback clock: store time updates ~4×/s, interpolate between them ───
    const clockRef = useRef({ base: usePlayerStore.getState().currentTime, at: performance.now() });
    useEffect(() => usePlayerStore.subscribe((s, prevS) => {
        if (s.currentTime !== prevS.currentTime || s.isPlaying !== prevS.isPlaying) {
            clockRef.current = { base: s.currentTime, at: performance.now() };
        }
    }), []);
    const playbackTime = useCallback(() => {
        const { base, at } = clockRef.current;
        return usePlayerStore.getState().isPlaying ? base + (performance.now() - at) / 1000 : base;
    }, []);

    // ─── Artwork palette → CSS variables ───
    useEffect(() => {
        let cancelled = false;
        if (!art) { setPalette(DEFAULT_PALETTE); return; }
        samplePalette(art).then(p => { if (!cancelled) setPalette(p ?? DEFAULT_PALETTE); });
        return () => { cancelled = true; };
    }, [art]);

    // ─── Frame loop: karaoke fill, progress, line changes (no React renders per frame) ───
    const activeRef = useRef(-1);
    useEffect(() => {
        let raf = 0;
        let lastText = 0;
        const frame = (ts: number) => {
            raf = requestAnimationFrame(frame);
            if (document.hidden) return;
            const { duration: dur } = usePlayerStore.getState();
            const { lyricOffset, lyricStyle, sleepAt } = useAmbientStore.getState();
            const t = playbackTime();
            const lt = t + lyricOffset;

            if (fillRef.current) fillRef.current.style.transform = `scaleX(${dur ? Math.min(t / dur, 1) : 0})`;
            if (ts - lastText > 250) {
                lastText = ts;
                if (curRef.current) curRef.current.textContent = fmt(t);
                const remaining = dur - t;
                setShowUpNext(dur > 0 && remaining < 20 && remaining > 0);
                if (sleepAt && Date.now() >= sleepAt) {
                    usePlayerStore.getState().pause();
                    useAmbientStore.getState().setSleep(0);
                }
            }

            if (plainRef.current && !lines.length && dur) {
                // Plain lyrics scroll through the stage over the song's length
                const el = plainRef.current;
                const travel = el.scrollHeight - (el.parentElement?.clientHeight ?? 0) * 0.5;
                el.style.transform = `translateY(${-Math.max(travel, 0) * Math.min(t / dur, 1) + (el.parentElement?.clientHeight ?? 0) * 0.25}px)`;
            }

            if (!lines.length) return;
            const idx = findLine(lines, lt);
            if (idx !== activeRef.current) {
                activeRef.current = idx;
                setActiveIdx(idx);
            }

            const line = lines[idx];
            const lineEl = trackRef.current?.children[idx] as HTMLElement | undefined;
            if (!lineEl) return;
            const end = lines[idx + 1]?.t ?? dur;
            if (!line.text) {
                const p = (lt - line.t) / Math.max(end - line.t, 0.1);
                lineEl.querySelectorAll('.amb-break i').forEach((d, k) => d.classList.toggle('on', p > k / 3));
                return;
            }
            if (lyricStyle !== 'karaoke') return;
            // Words fill across ~85% of the line, weighted by word length
            const words = lineEl.querySelectorAll<HTMLElement>('.amb-w');
            let total = 0;
            words.forEach(w => { total += w.textContent?.length ?? 1; });
            const pos = ((lt - line.t) / Math.max((end - line.t) * 0.85, 0.1)) * total;
            let acc = 0;
            words.forEach(w => {
                const len = w.textContent?.length ?? 1;
                const p = Math.min(Math.max((pos - acc) / len, 0), 1);
                w.style.setProperty('--p', p.toFixed(3));
                w.classList.toggle('done', p >= 1);
                acc += len;
            });
        };
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, [lines, playbackTime]);

    // Centre the active line
    useLayoutEffect(() => {
        const el = trackRef.current?.children[activeIdx] as HTMLElement | undefined;
        if (el && trackRef.current) {
            trackRef.current.style.transform = `translateY(${-(el.offsetTop + el.offsetHeight / 2)}px)`;
        }
    }, [activeIdx, amb.lyricScale, amb.scene, amb.lyricStyle, lines]);

    useEffect(() => { activeRef.current = -1; setActiveIdx(-1); }, [lines]);

    // ─── Clock (10 s) and burn-in shift (60 s) ───
    useEffect(() => {
        const c = window.setInterval(() => setNow(new Date()), 10_000);
        const s = window.setInterval(() => setShift(v => (v + 1) % 8), 60_000);
        return () => { window.clearInterval(c); window.clearInterval(s); };
    }, []);
    const shiftStyle = amb.burnInShift
        ? { transform: `translate(${Math.round(Math.cos(shift * Math.PI / 4) * 4)}px, ${Math.round(Math.sin(shift * Math.PI / 4) * 4)}px)` }
        : undefined;

    // ─── Full screen + keep display awake while open ───
    useEffect(() => {
        let wasFull = false;
        if (amb.fullScreen) {
            window.ipcRenderer.invoke('window:setFullScreen', true).then((prev: boolean) => { wasFull = prev; }).catch(() => { /* ignore */ });
        }
        return () => {
            if (amb.fullScreen && !wasFull) window.ipcRenderer.invoke('window:setFullScreen', false).catch(() => { /* ignore */ });
        };
        // Only on open/close
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => {
        window.ipcRenderer.invoke('ambient:keepAwake', amb.keepAwake && isPlaying).catch(() => { /* ignore */ });
    }, [amb.keepAwake, isPlaying]);
    useEffect(() => () => { window.ipcRenderer.invoke('ambient:keepAwake', false).catch(() => { /* ignore */ }); }, []);

    // ─── Idle chrome ───
    const idleTimer = useRef<number>();
    const wake = useCallback(() => {
        setIdle(false);
        window.clearTimeout(idleTimer.current);
        idleTimer.current = window.setTimeout(() => setIdle(true), 4000);
    }, []);
    useEffect(() => {
        wake();
        return () => window.clearTimeout(idleTimer.current);
    }, [wake]);

    // ─── Keyboard ───
    const cycleScene = useCallback(() => {
        const s = useAmbientStore.getState();
        s.set({ scene: AMBIENT_SCENES[(AMBIENT_SCENES.indexOf(s.scene) + 1) % AMBIENT_SCENES.length] });
    }, []);
    const cycleStyle = useCallback(() => {
        const s = useAmbientStore.getState();
        s.set({ lyricStyle: AMBIENT_STYLES[(AMBIENT_STYLES.indexOf(s.lyricStyle) + 1) % AMBIENT_STYLES.length] });
    }, []);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
            const p = usePlayerStore.getState();
            const k = e.key.toLowerCase();
            const handled = e.code === 'Space' || e.key === 'ArrowRight' || e.key === 'ArrowLeft' || k === 's' || k === 'l' || e.key === 'Escape';
            // Capture phase + stopPropagation: the full player's own Space/Esc handlers must not also fire
            if (handled) e.stopPropagation();
            if (e.code === 'Space') { e.preventDefault(); if (p.isPlaying) p.pause(); else p.play(); }
            else if (e.key === 'ArrowRight') p.seek(Math.min(playbackTime() + 5, p.duration));
            else if (e.key === 'ArrowLeft') p.seek(Math.max(playbackTime() - 5, 0));
            else if (k === 's') cycleScene();
            else if (k === 'l') cycleStyle();
            else if (e.key === 'Escape') {
                if (sheetOpen) setSheetOpen(false); else useAmbientStore.getState().close();
            }
            wake();
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [sheetOpen, wake, cycleScene, cycleStyle, playbackTime]);

    const onSeekBar = (e: React.MouseEvent<HTMLDivElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        seek(((e.clientX - r.left) / r.width) * (duration || 0));
    };

    const sleepLabel = amb.sleep === 0 ? 'Off' : amb.sleep === 'end' ? 'Song end' : fmt((amb.sleepAt - now.getTime()) / 1000);
    const currentLine = lines[activeIdx];
    const hm = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const date = now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });

    // Sleep timer "end of song": pause when the track changes
    const trackId = currentTrack?.id;
    const firstTrack = useRef(trackId);
    useEffect(() => {
        if (trackId !== firstTrack.current && useAmbientStore.getState().sleep === 'end') {
            usePlayerStore.getState().pause();
            useAmbientStore.getState().setSleep(0);
        }
        firstTrack.current = trackId;
    }, [trackId]);

    const cssVars = {
        '--a1': palette[0], '--a2': palette[1], '--a3': palette[2],
        '--speed': amb.lowPower ? 0.5 : 1,
        '--dim': amb.dim,
        '--lyric-scale': amb.lyricScale,
    } as React.CSSProperties;

    return (
        <div
            ref={rootRef}
            className={clsx('amb', idle && !sheetOpen && 'idle')}
            data-scene={amb.scene}
            data-style={amb.lyricStyle}
            data-playing={String(isPlaying)}
            style={cssVars}
            onPointerMove={wake}
            onPointerDown={wake}
            onWheel={wake}
            role="dialog"
            aria-label="Ambient mode"
        >
            {/* Backgrounds */}
            <div className="amb-scene" data-on={String(amb.scene === 'aurora')} aria-hidden="true">
                {art && <div className="amb-art-wash" style={{ backgroundImage: `url("${art}")` }} />}
                <div className="amb-blob b1" /><div className="amb-blob b2" /><div className="amb-blob b3" />
            </div>
            <div className="amb-scene amb-vinyl" data-on={String(amb.scene === 'vinyl')} aria-hidden="true">
                <div className="amb-record">
                    <div className="amb-record-spin">
                        <div className="amb-record-label" style={art ? { backgroundImage: `url("${art}")` } : { background: `rgb(${palette[1]})` }} />
                        <div className="amb-record-sheen" />
                        <div className="amb-record-hole" />
                    </div>
                </div>
            </div>
            <div className="amb-scene amb-horizon" data-on={String(amb.scene === 'horizon')} aria-hidden="true">
                <div className="amb-sun" />
                <HorizonWaves active={amb.scene === 'horizon'} playing={isPlaying} lowPower={amb.lowPower} />
            </div>
            <div className="amb-scene amb-oled" data-on={String(amb.scene === 'clock')} aria-hidden="true" />
            <div className="amb-grain" aria-hidden="true" />
            <div className="amb-vignette" aria-hidden="true" />
            <div className="amb-dimmer" aria-hidden="true" />

            <main className="amb-room" style={shiftStyle}>
                <header className="amb-top">
                    <div className="amb-clock" style={{ visibility: amb.showClock ? undefined : 'hidden' }}>
                        <time>{hm}</time>
                        <small>{date}</small>
                    </div>
                    <div className="amb-chips amb-chrome">
                        <span className="amb-chip"><span className="dot" />Ambient · <b>{SCENE_LABEL[amb.scene]}</b></span>
                        <button className="amb-chip" type="button" onClick={() => setSheetOpen(true)}>Sleep <b>{sleepLabel}</b></button>
                        <button className="amb-chip" type="button" onClick={() => useAmbientStore.getState().close()} title="Leave ambient mode (Esc)">
                            <X size={14} /> Exit
                        </button>
                    </div>
                </header>

                <section className="amb-stage" aria-label="Lyrics">
                    <div className="amb-lyrics">
                        {hasSynced ? (
                            <div className="amb-track" ref={trackRef} aria-live="polite">
                                {lines.map((line, i) => {
                                    const d = i - activeIdx;
                                    return (
                                        <div
                                            key={`${line.t}-${i}`}
                                            className={clsx('amb-line', d === 0 && 'now', d < 0 && 'past', d === 1 && 'next', Math.abs(d) === 1 && 'near', Math.abs(d) > 2 && 'far')}
                                            onClick={() => seek(Math.max(line.t - amb.lyricOffset + 0.01, 0))}
                                        >
                                            {line.text
                                                ? line.text.split(' ').map((w, wi, arr) => (
                                                    <span key={wi} className="amb-w">{w}{wi < arr.length - 1 ? ' ' : ''}</span>
                                                ))
                                                : <span className="amb-break" aria-label="Instrumental"><i /><i /><i /></span>}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : lyrics?.plainLyrics ? (
                            <div className="amb-plain" ref={plainRef}>{lyrics.plainLyrics}</div>
                        ) : (
                            <div className="amb-empty" style={{ position: 'absolute', inset: 0, justifyContent: 'center' }}>
                                <h2>{currentTrack?.title || 'Nothing playing'}</h2>
                                <p>{currentTrack?.artist || 'Pick a song to start'}</p>
                            </div>
                        )}
                    </div>
                    <div className="amb-bigclock">
                        <time>{hm}</time>
                        <p>{currentLine?.text || (currentLine ? '♪' : currentTrack?.title || '')}</p>
                    </div>
                </section>

                <footer className="amb-bottom">
                    <div className="amb-np">
                        <div className="amb-art" style={art ? { backgroundImage: `url("${art}")` } : undefined} />
                        <div className="amb-meta">
                            <div className="amb-title">{currentTrack?.title || 'Nothing playing'}</div>
                            <div className="amb-sub">{[currentTrack?.artist, currentTrack?.album].filter(Boolean).join(' · ')}</div>
                            <div className="amb-prog">
                                <span ref={curRef}>0:00</span>
                                <div className="amb-bar" onClick={onSeekBar}><i ref={fillRef} /></div>
                                <span>{fmt(duration)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="amb-right">
                        {upNext && (
                            <div className={clsx('amb-upnext', showUpNext && isPlaying && 'show')}>
                                <div className="amb-art" style={upNextArt ? { backgroundImage: `url("${upNextArt}")` } : undefined} />
                                <div style={{ minWidth: 0 }}>
                                    <small>Up next</small>
                                    <b>{upNext.title} · {upNext.artist}</b>
                                </div>
                            </div>
                        )}
                        <div className="amb-controls amb-chrome">
                            <button className="amb-ctl" type="button" aria-label="Previous" onClick={() => prev()}><SkipBack size={20} fill="currentColor" /></button>
                            <button className="amb-ctl play" type="button" aria-label={isPlaying ? 'Pause' : 'Play'} onClick={() => (isPlaying ? pause() : play())}>
                                {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" style={{ marginLeft: 2 }} />}
                            </button>
                            <button className="amb-ctl" type="button" aria-label="Next" onClick={() => next()}><SkipForward size={20} fill="currentColor" /></button>
                            <button className="amb-ctl" type="button" aria-label="Ambient settings" onClick={() => setSheetOpen(o => !o)}><Settings2 size={20} /></button>
                        </div>
                        <div className="amb-tools amb-chrome">
                            <button className="amb-tool" type="button" onClick={cycleScene}>Scene</button>
                            <button className="amb-tool" type="button" onClick={cycleStyle}>Lyrics style</button>
                        </div>
                    </div>
                </footer>
            </main>

            <AmbientSettings open={sheetOpen} onClose={() => setSheetOpen(false)} />
        </div>
    );
};

const Seg = <T extends string | number,>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) => (
    <div className="amb-seg">
        {options.map(o => (
            <button key={String(o.v)} type="button" aria-pressed={o.v === value} onClick={() => onChange(o.v)}>{o.label}</button>
        ))}
    </div>
);

const Switch = ({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) => (
    <button className="amb-switch" type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />
);

const AmbientSettings = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    const s = useAmbientStore();
    const set = s.set;
    return (
        <aside className={clsx('amb-sheet', open && 'open')} aria-label="Ambient settings" aria-hidden={!open}>
            <h2>
                Ambient mode
                <button className="amb-ctl" type="button" aria-label="Close settings" onClick={onClose} style={{ width: 36, height: 36 }}><X size={18} /></button>
            </h2>

            <div className="amb-group"><span>Scene</span>
                <Seg value={s.scene} onChange={v => set({ scene: v })}
                    options={AMBIENT_SCENES.map(v => ({ v, label: SCENE_LABEL[v] }))} />
            </div>

            <div className="amb-group"><span>Lyrics</span>
                <Seg value={s.lyricStyle} onChange={v => set({ lyricStyle: v })}
                    options={[{ v: 'karaoke', label: 'Karaoke' }, { v: 'scroll', label: 'Scroll' }, { v: 'focus', label: 'Focus' }]} />
                <label className="amb-row" htmlFor="amb-size">Text size</label>
                <input id="amb-size" type="range" min={0.75} max={1.4} step={0.05} value={s.lyricScale} onChange={e => set({ lyricScale: parseFloat(e.target.value) })} />
                <div className="amb-row">
                    <div>Sync offset<small>Nudge if lyrics run early or late</small></div>
                    <div className="amb-offset">
                        <button type="button" title="Show lyrics later" onClick={() => set({ lyricOffset: Math.round((s.lyricOffset - 0.5) * 10) / 10 })}>−</button>
                        <output>{s.lyricOffset === 0 ? 'In sync' : `${Math.abs(s.lyricOffset).toFixed(1)} s ${s.lyricOffset > 0 ? 'earlier' : 'later'}`}</output>
                        <button type="button" title="Show lyrics earlier" onClick={() => set({ lyricOffset: Math.round((s.lyricOffset + 0.5) * 10) / 10 })}>+</button>
                    </div>
                </div>
            </div>

            <div className="amb-group"><span>Display</span>
                <label className="amb-row" htmlFor="amb-dim">Dim</label>
                <input id="amb-dim" type="range" min={0} max={0.7} step={0.05} value={s.dim} onChange={e => set({ dim: parseFloat(e.target.value) })} />
                <div className="amb-row"><div>Clock</div><Switch on={s.showClock} onChange={v => set({ showClock: v })} label="Show clock" /></div>
                <div className="amb-row"><div>Burn-in shift<small>Moves content a few pixels every minute</small></div><Switch on={s.burnInShift} onChange={v => set({ burnInShift: v })} label="Burn-in shift" /></div>
                <div className="amb-row"><div>Low power<small>Half-speed motion, waves at 15 fps</small></div><Switch on={s.lowPower} onChange={v => set({ lowPower: v })} label="Low power" /></div>
                <div className="amb-row"><div>Full screen<small>When ambient mode opens</small></div><Switch on={s.fullScreen} onChange={v => set({ fullScreen: v })} label="Full screen" /></div>
                <div className="amb-row"><div>Keep screen on<small>While music plays</small></div><Switch on={s.keepAwake} onChange={v => set({ keepAwake: v })} label="Keep screen on" /></div>
            </div>

            <div className="amb-group"><span>Start automatically</span>
                <Seg value={s.idleMinutes} onChange={v => set({ idleMinutes: v })}
                    options={[{ v: 0, label: 'Never' }, { v: 2, label: '2 m' }, { v: 5, label: '5 m' }, { v: 10, label: '10 m' }, { v: 20, label: '20 m' }]} />
            </div>

            <div className="amb-group"><span>Sleep timer</span>
                <Seg<SleepTimer> value={s.sleep} onChange={v => s.setSleep(v)}
                    options={[{ v: 0, label: 'Off' }, { v: 15, label: '15 m' }, { v: 30, label: '30 m' }, { v: 60, label: '60 m' }, { v: 'end', label: 'Song' }]} />
            </div>

            <div className="amb-group"><span>Keyboard</span>
                <div className="amb-keys">
                    <kbd>Space</kbd><span>Play / pause</span>
                    <kbd>← →</kbd><span>Seek 5 s</span>
                    <kbd>S</kbd><span>Next scene</span>
                    <kbd>L</kbd><span>Next lyrics style</span>
                    <kbd>Esc</kbd><span>Close settings / leave ambient mode</span>
                </div>
            </div>
        </aside>
    );
};

export default AmbientMode;
