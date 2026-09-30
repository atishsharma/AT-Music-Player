import { Minus, Square, X, Maximize } from 'lucide-react';
import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { useThemeStore } from '../../store/themeStore';


const TitleBar = () => {
    const liquidGlass = useThemeStore(s => s.liquidGlass);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isMiniMode, setIsMiniMode] = useState(false);

    // Window state is pushed by the main process (was polled over IPC twice per second)
    useEffect(() => {
        const apply = (state?: { isMaximized: boolean; isMiniPlayer: boolean; isFullScreen: boolean }) => {
            if (!state) return;
            setIsMaximized(state.isMaximized);
            setIsMiniMode(state.isMiniPlayer);
            setIsFullScreen(state.isFullScreen);
        };
        (window as any).windowControls?.getState?.().then(apply).catch(() => { /* ignore */ });
        const unsubscribe = window.ipcRenderer?.on?.('window:state', (_event, state) => apply(state));
        return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
    }, []);

    // ESC exits fullscreen
    useEffect(() => {
        if (!isFullScreen) return;
        const handleKeyDown = async (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                const fs = await (window as any).windowControls.toggleFullScreen();
                setIsFullScreen(fs);
                setIsHovering(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullScreen]);

    const handleFullScreen = async () => {
        try {
            const fs = await (window as any).windowControls.toggleFullScreen();
            setIsFullScreen(fs);
        } catch { /* ignore */ }
    };

    return (
        <div
            className={clsx(
                "fixed top-0 inset-x-0 z-[100] flex items-center justify-between h-[36px] transition-all duration-300",
                isFullScreen 
                    ? (isHovering ? "translate-y-0 bg-background/95 backdrop-blur-xl shadow-xl pointer-events-auto" : "-translate-y-full opacity-0 pointer-events-none") 
                    : clsx(liquidGlass ? "bg-transparent" : "bg-background md:bg-transparent", "pointer-events-auto"),
                // Provide a tiny hover hit-box when hidden
                isFullScreen && !isHovering ? "h-2 border-none bg-transparent translate-y-0 opacity-0 pointer-events-auto no-drag" : "drag"
            )}
            onMouseEnter={() => isFullScreen && setIsHovering(true)}
            onMouseLeave={() => isFullScreen && setIsHovering(false)}
        >
            <div className="flex-1 flex items-center pl-3">
                <img src="./app_icon.png" alt="AT Music Pro" className="w-[18px] h-[18px] object-contain drop-shadow-md" />
            </div>

            <div className="flex shrink-0 items-center justify-center font-black uppercase tracking-[0.2em] pointer-events-none select-none">
                {isFullScreen && isHovering ? (
                    <span className="text-[9px] text-primary/60">Press ESC to exit Full Screen</span>
                ) : (
                    <span className={clsx("text-[10px]", isFullScreen ? "text-primary/60" : "text-primary/80 drop-shadow-[0_2px_10px_rgba(var(--md-sys-color-primary),0.3)]")}>
                        AT Music Pro
                    </span>
                )}
            </div>

            <div className="flex-1 flex shrink-0 items-center justify-end h-full no-drag">
                <div className="flex h-full">
                <button
                    onClick={() => (window as any).windowControls.minimize()}
                    className="h-full px-4 hover:bg-surface-variant/30 text-on-surface-variant transition-colors flex items-center justify-center"
                    title="Minimize"
                >
                    <Minus size={16} />
                </button>
                {!isMiniMode && (
                    <>
                        <button
                            onClick={() => (window as any).windowControls.maximize()}
                            className="h-full px-4 hover:bg-surface-variant/30 text-on-surface-variant transition-colors flex items-center justify-center"
                            title={isMaximized ? "Restore" : "Maximize"}
                        >
                            {isMaximized ? <Minus size={14} className="scale-x-125 rotate-90" /> : <Square size={14} />}
                        </button>
                        <button
                            onClick={handleFullScreen}
                            className="h-full px-4 hover:bg-surface-variant/30 text-primary transition-colors flex items-center justify-center relative group"
                            title="Full Screen"
                        >
                            <Maximize size={14} className={isFullScreen ? "opacity-30" : "opacity-100"} />
                        </button>
                    </>
                )}
                <button
                    onClick={() => (window as any).windowControls.close()}
                    className="h-full px-4 hover:bg-red-500 hover:text-white text-on-surface-variant transition-colors flex items-center justify-center"
                    title="Close"
                >
                    <X size={16} />
                </button>
                </div>
            </div>
        </div>
    );
};

export default TitleBar;
