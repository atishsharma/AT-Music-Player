import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Plus, Trash2, Wand2, X } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { FIELDS, OPS, SORTS, defaultRule, emptyDef, fieldKind, type Rule, type RuleField, type SmartDef } from './smart';

const input = "h-9 rounded-[10px] bg-on-background/[0.06] px-3 text-[13px] text-on-background outline-none focus:ring-2 focus:ring-primary/50 border border-transparent";

/** Modal to create or edit a smart playlist, with a live match count */
const SmartRuleBuilder = ({ initial, onClose, onSaved }: { initial?: SmartDef | null; onClose: () => void; onSaved: (id: number) => void }) => {
    const [def, setDef] = useState<SmartDef>(() => initial ? structuredClone(initial) : emptyDef());
    const [count, setCount] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const glass = useThemeStore(s => s.liquidGlass);

    // Live preview, debounced
    useEffect(() => {
        const t = window.setTimeout(() => {
            window.ipcRenderer.invoke('smart:preview', def).then((r: { count: number }) => setCount(r?.count ?? 0));
        }, 250);
        return () => window.clearTimeout(t);
    }, [def]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const setRule = (i: number, patch: Partial<Rule>) =>
        setDef(d => ({ ...d, rules: d.rules.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));

    const changeField = (i: number, field: RuleField) => {
        const keep = fieldKind(field) === fieldKind(def.rules[i].field);
        setRule(i, keep ? { field } : defaultRule(field));
    };

    const save = async () => {
        setSaving(true);
        try {
            const id = await window.ipcRenderer.invoke('smart:save', { ...def, name: def.name.trim() || 'Smart playlist' });
            onSaved(id);
        } finally { setSaving(false); }
    };

    return createPortal(
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm grid place-items-center p-4" onMouseDown={onClose}>
            <motion.div
                initial={{ y: 16, scale: 0.97 }} animate={{ y: 0, scale: 1 }}
                onMouseDown={e => e.stopPropagation()}
                className={clsx("w-full max-w-[640px] max-h-[90vh] overflow-auto rounded-[24px] p-6 text-on-background shadow-2xl",
                    glass ? "lg-panel lg-strong lg-blur" : "bg-background border border-on-background/10")}
                role="dialog" aria-label="Smart playlist"
            >
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold flex items-center gap-2"><Wand2 size={19} className="text-primary" /> {initial?.id ? 'Edit smart playlist' : 'New smart playlist'}</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-full grid place-items-center hover:bg-on-background/10" aria-label="Close"><X size={17} /></button>
                </div>

                <input autoFocus value={def.name} onChange={e => setDef(d => ({ ...d, name: e.target.value }))}
                    placeholder="Name, e.g. “Chill under 4 minutes”" className={clsx(input, "w-full h-11 text-[15px] mb-5")} />

                <div className="flex items-center gap-2 text-[13px] mb-3">
                    Match
                    <select value={def.match} onChange={e => setDef(d => ({ ...d, match: e.target.value as SmartDef['match'] }))} className={input}>
                        <option value="all">all</option>
                        <option value="any">any</option>
                    </select>
                    of these rules
                </div>

                <div className="space-y-2">
                    {def.rules.map((r, i) => {
                        const kind = fieldKind(r.field);
                        const unit = FIELDS.find(f => f.v === r.field)?.unit;
                        return (
                            <div key={i} className="flex flex-wrap items-center gap-2 p-2 rounded-[14px] bg-on-background/[0.035]">
                                <select value={r.field} onChange={e => changeField(i, e.target.value as RuleField)} className={input} aria-label="Field">
                                    {FIELDS.map(f => <option key={f.v} value={f.v}>{f.label}</option>)}
                                </select>
                                <select value={r.op} onChange={e => setRule(i, { op: e.target.value })} className={input} aria-label="Condition">
                                    {OPS[kind].map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
                                </select>
                                {kind === 'source' ? (
                                    <select value={String(r.value)} onChange={e => setRule(i, { value: e.target.value })} className={input} aria-label="Value">
                                        <option value="local">Local files</option>
                                        <option value="youtube">YouTube</option>
                                    </select>
                                ) : (
                                    <div className="flex items-center gap-1.5 flex-1 min-w-[120px]">
                                        <input
                                            value={r.value}
                                            type={kind === 'text' ? 'text' : 'number'}
                                            min={0}
                                            onChange={e => setRule(i, { value: kind === 'text' ? e.target.value : Number(e.target.value) })}
                                            className={clsx(input, "flex-1 min-w-0")}
                                            aria-label="Value"
                                        />
                                        {unit && <span className="text-[12px] text-on-background/50">{unit}</span>}
                                    </div>
                                )}
                                <button onClick={() => setDef(d => ({ ...d, rules: d.rules.filter((_, j) => j !== i) }))}
                                    className="w-8 h-8 rounded-full grid place-items-center text-on-background/50 hover:text-red-500 hover:bg-red-500/10 ml-auto" aria-label="Remove rule">
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        );
                    })}
                </div>
                <button onClick={() => setDef(d => ({ ...d, rules: [...d.rules, defaultRule('plays')] }))}
                    className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] text-primary hover:bg-primary/10">
                    <Plus size={15} /> Add rule
                </button>

                <div className="flex flex-wrap items-center gap-3 mt-5 text-[13px]">
                    <label className="flex items-center gap-2">Sort by
                        <select value={def.sort} onChange={e => setDef(d => ({ ...d, sort: e.target.value as SmartDef['sort'] }))} className={input}>
                            {SORTS.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
                        </select>
                    </label>
                    <label className="flex items-center gap-2">Limit
                        <input type="number" min={1} max={1000} value={def.limit} onChange={e => setDef(d => ({ ...d, limit: Number(e.target.value) }))} className={clsx(input, "w-20")} />
                        songs
                    </label>
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-on-background/10">
                    <span className="text-[13px] text-on-background/60">{count === null ? 'Counting…' : `${Math.min(count, def.limit || count)} matching songs`}</span>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 rounded-full text-[13px] hover:bg-on-background/10">Cancel</button>
                        <button onClick={save} disabled={saving} className="px-5 py-2 rounded-full bg-primary text-on-primary text-[13px] font-semibold disabled:opacity-50 hover:brightness-110">
                            {initial?.id ? 'Save' : 'Create'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>,
        document.body
    );
};

export default SmartRuleBuilder;
