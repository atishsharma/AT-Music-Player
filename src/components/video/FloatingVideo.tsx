import { useEffect, useRef, useState } from 'react';
import { Captions, CaptionsOff, Maximize, Pause, Pin, PinOff, Play, Undo2, X } from 'lucide-react';
import clsx from 'clsx';

interface Payload {
    url: string;
    time: number;
    title: string;
    artist: string;
    subtitle?: { vtt: string; lang: string } | null;
}

const fmt = (s: number) => `${Math.floor((s || 0) / 60)}:${Math.floor((s || 0) % 60).toString().padStart(2, '0')}`;

/** The always-on-top floating video window (#/video). */
const FloatingVideo = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [payload, setPayload] = useState<Payload | null>(null);
    const [playing, setPlaying] = useState(true);
    const [time, setTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showSubs, setShowSubs] = useState(true);
    const [pinned, setPinned] = useState(true);
    const [trackUrl, setTrackUrl] = useState<string | null>(null);

    useEffect(() => {
        document.documentElement.style.background = '#000';
        document.body.style.background = '#000';
        window.ipcRenderer.invoke('video:getPayload').then((p: Payload | null) => p && setPayload(p));
        return window.ipcRenderer.on('video:payload', (_e, p: Payload) => setPayload(p));
    }, []);

    useEffect(() => {
        document.title = payload ? `${payload.title} · ${payload.artist}` : 'AT Music Pro';
        if (!payload?.subtitle?.vtt) { setTrackUrl(null); return; }
        const url = URL.createObjectURL(new Blob([payload.subtitle.vtt], { type: 'text/vtt' }));
        setTrackUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [payload]);

    useEffect(() => {
        const track = videoRef.current?.textTracks?.[0];
        if (track) track.mode = showSubs ? 'showing' : 'hidden';
    }, [showSubs, trackUrl]);

    const state = () => ({ time: videoRef.current?.currentTime ?? time, playing: !!videoRef.current && !videoRef.current.paused });

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const v = videoRef.current;
            if (!v) return;
            if (e.code === 'Space') { e.preventDefault(); if (v.paused) v.play(); else v.pause(); }
            if (e.key === 'ArrowRight') v.currentTime += 5;
            if (e.key === 'ArrowLeft') v.currentTime -= 5;
            if (e.key === 'Escape') window.ipcRenderer.invoke('video:return', state());
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    if (!payload) return <div className="w-screen h-screen bg-black" />;

    const btn = "no-drag w-8 h-8 rounded-full grid place-items-center text-white/85 hover:text-white hover:bg-white/15 transition-colors";

    return (
        <div className="group relative w-screen h-screen bg-black overflow-hidden select-none">
            <video
                ref={videoRef}
                src={payload.url}
                autoPlay
                className="absolute inset-0 w-full h-full object-contain"
                onLoadedMetadata={(e) => { const v = e.currentTarget; v.currentTime = payload.time; setDuration(v.duration); }}
                onTimeUpdate={(e) => { const t = e.currentTarget.currentTime; setTime(t); window.ipcRenderer.send('video:time', t); }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => window.ipcRenderer.invoke('video:close', { time: duration, playing: true })}
                onDoubleClick={() => window.ipcRenderer.invoke('video:toggleFullScreen')}
            >
                {trackUrl && <track kind="subtitles" src={trackUrl} srcLang={payload.subtitle?.lang} label={payload.subtitle?.lang} default />}
            </video>

            {/* Top bar: drag handle + window actions (shown on hover) */}
            <div className="drag absolute inset-x-0 top-0 h-12 px-2 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="min-w-0 pl-2">
                    <p className="text-white text-[12px] font-semibold truncate">{payload.title}</p>
                    <p className="text-white/60 text-[11px] truncate">{payload.artist}</p>
                </div>
                <div className="flex items-center gap-0.5">
                    <button className={btn} title={pinned ? 'Unpin (always on top)' : 'Pin on top'} onClick={async () => setPinned(await window.ipcRenderer.invoke('video:setAlwaysOnTop', !pinned))}>
                        {pinned ? <Pin size={15} /> : <PinOff size={15} />}
                    </button>
                    <button className={btn} title="Back to the app" onClick={() => window.ipcRenderer.invoke('video:return', state())}><Undo2 size={15} /></button>
                    <button className={btn} title="Close video, keep listening" onClick={() => window.ipcRenderer.invoke('video:close', state())}><X size={16} /></button>
                </div>
            </div>

            {/* Bottom controls */}
            <div className="absolute inset-x-0 bottom-0 px-3 pb-2 pt-6 bg-gradient-to-t from-black/75 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <input
                    type="range" min={0} max={duration || 0} step={0.1} value={time}
                    onChange={(e) => { if (videoRef.current) videoRef.current.currentTime = parseFloat(e.target.value); }}
                    className="no-drag w-full accent-[rgb(var(--md-sys-color-primary))] h-1"
                    aria-label="Seek"
                />
                <div className="flex items-center gap-1 mt-1">
                    <button className={btn} title={playing ? 'Pause' : 'Play'} onClick={() => { const v = videoRef.current; if (v) { if (v.paused) v.play(); else v.pause(); } }}>
                        {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                    </button>
                    <span className="text-white/75 text-[11px] font-mono tabular-nums">{fmt(time)} / {fmt(duration)}</span>
                    <span className="flex-1" />
                    {trackUrl && (
                        <button className={clsx(btn, showSubs && "text-white bg-white/15")} title="Subtitles" onClick={() => setShowSubs(s => !s)}>
                            {showSubs ? <Captions size={16} /> : <CaptionsOff size={16} />}
                        </button>
                    )}
                    <button className={btn} title="Full screen" onClick={() => window.ipcRenderer.invoke('video:toggleFullScreen')}><Maximize size={15} /></button>
                </div>
            </div>
        </div>
    );
};

export default FloatingVideo;
