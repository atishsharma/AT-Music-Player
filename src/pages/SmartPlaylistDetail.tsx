import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, Pencil, Play, Shuffle, Trash2, Wand2 } from 'lucide-react';
import SongList from '../components/library/SongList';
import SmartRuleBuilder from '../components/playlists/SmartRuleBuilder';
import { FIELDS, OPS, SORTS, fieldKind, type SmartDef } from '../components/playlists/smart';
import { usePlayerStore } from '../store/playerStore';
import type { Track } from '../types/library';

type Smart = SmartDef & { tracks: Track[] };

const describe = (d: SmartDef) => d.rules.map(r => {
    const f = FIELDS.find(x => x.v === r.field);
    const op = OPS[fieldKind(r.field)].find(o => o.v === r.op)?.label ?? r.op;
    const value = r.field === 'source' ? (r.value === 'local' ? 'local files' : 'YouTube') : `${r.value}${f?.unit ? ' ' + f.unit : ''}`;
    return `${f?.label ?? r.field} ${op} ${value}`;
}).join(d.match === 'any' ? ' · or · ' : ' · ');

const SmartPlaylistDetail = () => {
    const { id = '' } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<Smart | null>(null);
    const [editing, setEditing] = useState(false);
    const play = usePlayerStore(s => s.play);
    const setQueue = usePlayerStore(s => s.setQueue);

    const key = /^\d+$/.test(id) ? Number(id) : id;
    const load = useCallback(() => window.ipcRenderer.invoke('smart:get', key).then(setData), [key]);
    useEffect(() => { load(); }, [load]);

    if (!data) return <div className="p-8 text-on-background/60">Loading…</div>;

    const start = (tracks: Track[], i = 0) => {
        if (!tracks.length) return;
        setQueue(tracks.slice(i + 1));
        play(tracks[i]);
    };
    const shuffled = () => [...data.tracks].sort(() => Math.random() - 0.5);

    return (
        <div className="h-full flex flex-col text-on-background">
            <div className="p-8 pb-6 bg-gradient-to-b from-primary/20 to-transparent">
                <button onClick={() => navigate('/playlists')} className="flex items-center gap-2 text-on-background/60 hover:text-primary mb-6 text-[13px] font-semibold">
                    <ArrowLeft size={18} /> Playlists
                </button>
                <div className="flex flex-wrap items-end gap-6">
                    <div className="w-40 h-40 rounded-3xl bg-gradient-to-br from-primary to-primary/30 grid place-items-center text-on-primary shadow-xl shadow-primary/20">
                        <Wand2 size={56} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-on-background/50">Smart playlist{data.builtin ? ' · built in' : ''}</p>
                        <h1 className="text-5xl font-black tracking-tighter text-primary truncate">{data.name}</h1>
                        <p className="text-[13px] text-on-background/60 mt-1">
                            {data.builtin ? data.description : describe(data)} · {SORTS.find(s => s.v === data.sort)?.label} · {data.tracks.length} songs
                        </p>
                        <div className="flex items-center gap-2 mt-4">
                            <button onClick={() => start(data.tracks)} disabled={!data.tracks.length} className="w-12 h-12 rounded-full bg-primary text-on-primary grid place-items-center shadow-lg shadow-primary/30 hover:scale-105 disabled:opacity-40" aria-label="Play">
                                <Play size={22} fill="currentColor" className="ml-0.5" />
                            </button>
                            <button onClick={() => start(shuffled())} disabled={!data.tracks.length} className="w-10 h-10 rounded-full bg-on-background/[0.07] grid place-items-center hover:bg-on-background/[0.12] disabled:opacity-40" aria-label="Shuffle">
                                <Shuffle size={17} />
                            </button>
                            {!data.builtin && (
                                <>
                                    <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-4 h-10 rounded-full bg-on-background/[0.07] hover:bg-on-background/[0.12] text-[13px] font-semibold">
                                        <Pencil size={15} /> Edit rules
                                    </button>
                                    <button
                                        onClick={async () => { await window.ipcRenderer.invoke('smart:delete', data.id); navigate('/playlists'); }}
                                        className="w-10 h-10 rounded-full grid place-items-center text-on-background/60 hover:text-red-500 hover:bg-red-500/10" aria-label="Delete smart playlist"
                                    >
                                        <Trash2 size={17} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
                {data.tracks.length ? (
                    <SongList tracks={data.tracks} onPlay={(t) => start(data.tracks, data.tracks.indexOf(t))} />
                ) : (
                    <div className="text-center py-20 text-on-background/55">
                        <p className="font-semibold">No songs match yet</p>
                        <p className="text-sm">This playlist fills itself as your library and history grow.</p>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {editing && <SmartRuleBuilder initial={data} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />}
            </AnimatePresence>
        </div>
    );
};

export default SmartPlaylistDetail;
