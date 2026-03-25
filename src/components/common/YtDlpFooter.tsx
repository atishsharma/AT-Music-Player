import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, RefreshCw, ExternalLink, X } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export const YtDlpFooter = () => {
    const [hasYtDlp, setHasYtDlp] = useState<boolean | null>(null);
    // Use sessionStorage so it only shows once per app launch (session)
    const [isVisible, setIsVisible] = useState(!sessionStorage.getItem('ytdlpFooterShown'));

    const checkStatus = async () => {
        setHasYtDlp(null);
        try {
            const status = await (window as any).ytdlp.check();
            setHasYtDlp(status);
        } catch (err) {
            console.error(err);
            setHasYtDlp(false);
        }
    };

    useEffect(() => {
        checkStatus();
    }, []);

    useEffect(() => {
        if (hasYtDlp && isVisible) {
            // Mark as shown for this session
            sessionStorage.setItem('ytdlpFooterShown', 'true');
            // Auto-dismiss after 3 seconds when backend is active
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [hasYtDlp, isVisible]);

    if (!isVisible || hasYtDlp === null) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                className={clsx(
                    "fixed bottom-32 right-8 z-40 flex items-center gap-4 px-6 py-4 rounded-3xl shadow-2xl backdrop-blur-xl border border-white/10 max-w-xl w-[400px]",
                    hasYtDlp ? "bg-primary/20 text-primary border-primary/30" : "bg-red-500/20 text-red-500 border-red-500/30"
                )}
            >
                {hasYtDlp ? <CheckCircle size={28} className="shrink-0" /> : <AlertCircle size={28} className="shrink-0" />}

                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black uppercase tracking-widest truncate">
                        {hasYtDlp ? 'Backend Active' : 'Missing Dependency'}
                    </h4>
                    <p className={clsx("text-[11px] font-bold opacity-80 mt-0.5", hasYtDlp ? "text-primary/80" : "text-red-500/80")}>
                        {hasYtDlp
                            ? "yt-dlp detected. Online features ready."
                            : 'yt-dlp is required for downloads and online streams.'}
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {!hasYtDlp && (
                        <a
                            href="https://github.com/yt-dlp/yt-dlp/wiki/Installation"
                            target="_blank"
                            rel="noreferrer"
                            className="p-3 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl transition-all"
                            title="Get yt-dlp"
                        >
                            <ExternalLink size={20} />
                        </a>
                    )}
                    {!hasYtDlp && (
                        <button
                            onClick={checkStatus}
                            className="p-3 bg-red-500/20 hover:bg-red-500 hover:text-white rounded-2xl transition-all"
                            title="Recheck System"
                        >
                            <RefreshCw size={16} />
                        </button>
                    )}
                    <button
                        onClick={() => {
                            sessionStorage.setItem('ytdlpFooterShown', 'true');
                            setIsVisible(false);
                        }}
                        className="p-3 ml-2 hover:bg-white/10 rounded-2xl transition-all"
                        title="Dismiss"
                    >
                        <X size={20} />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
