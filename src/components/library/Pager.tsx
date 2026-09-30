import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface PagerProps {
    page: number;
    totalPages: number;
    onChange: (page: number) => void;
}

/** ‹ 1 · [jump to] · N › page control used by the library's songs, albums and artists views */
const Pager = ({ page, totalPages, onChange }: PagerProps) => {
    const [input, setInput] = useState(String(page));
    useEffect(() => { setInput(String(page)); }, [page]);

    if (totalPages <= 1) return null;

    const submit = (value: string) => {
        const n = parseInt(value, 10);
        if (!isNaN(n) && n >= 1 && n <= totalPages) onChange(n);
        else setInput(String(page));
    };

    return (
        <div className="flex items-center gap-3 bg-surface-variant/20 rounded-full border border-primary/30 p-1.5 outline outline-1 outline-primary/20 shadow-lg shadow-black/20">
            <button
                disabled={page === 1}
                onClick={() => onChange(Math.max(1, page - 1))}
                className="p-2.5 rounded-full text-on-surface-variant hover:text-primary hover:bg-primary/10 disabled:opacity-20 transition-all active:scale-90"
                aria-label="Previous page"
            >
                <ChevronLeft size={20} />
            </button>

            <div className="flex items-center gap-3 px-2">
                <button
                    onClick={() => onChange(1)}
                    className={clsx("text-[10px] font-black transition-all hover:text-primary", page === 1 ? "text-primary scale-110" : "text-on-surface-variant/40")}
                >
                    1
                </button>
                <div className="h-1 w-1 rounded-full bg-white/10" />

                <div className="relative group">
                    <input
                        type="text"
                        inputMode="numeric"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onBlur={(e) => submit(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') submit((e.target as HTMLInputElement).value); }}
                        aria-label="Page"
                        className="w-14 bg-primary/10 border border-primary/20 rounded-lg py-1.5 text-center text-sm font-black text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-inner"
                    />
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-surface border border-white/10 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Jump to
                    </div>
                </div>

                <div className="h-1 w-1 rounded-full bg-white/10" />
                <button
                    onClick={() => onChange(totalPages)}
                    className={clsx("text-[10px] font-black transition-all hover:text-primary", page === totalPages ? "text-primary scale-110" : "text-on-surface-variant/40")}
                >
                    {totalPages}
                </button>
            </div>

            <button
                disabled={page >= totalPages}
                onClick={() => onChange(Math.min(totalPages, page + 1))}
                className="p-2.5 rounded-full text-on-surface-variant hover:text-primary hover:bg-primary/10 disabled:opacity-20 transition-all active:scale-90"
                aria-label="Next page"
            >
                <ChevronRight size={20} />
            </button>
        </div>
    );
};

export default Pager;
