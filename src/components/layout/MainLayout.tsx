
import { Outlet, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import Sidebar from './Sidebar';
import PlayerBar from './PlayerBar';

import Player from '../common/Player';
import NowPlaying from '../common/NowPlaying';
import MiniPlayer from '../common/MiniPlayer';
import { AnimatePresence, motion } from 'framer-motion';

import BackgroundWatermarks from '../common/BackgroundWatermarks';

import SidebarOverlay from '../common/SidebarOverlay';
import { usePlayerStore } from '../../store/playerStore';
import { useThemeStore } from '../../store/themeStore';
import { useSettingsStore } from '../../store/settingsStore';
import Toast from '../common/Toast';
import LiquidBackdrop from '../common/LiquidBackdrop';
import { useWidgetBridge } from '../../hooks/useWidgetBridge';
import { useRadioTopUp } from '../../hooks/useRadio';
import { useState, useEffect, Suspense, lazy } from 'react';
import { useAmbientStore } from '../../store/ambientStore';

// Loaded on first use: keeps ambient mode out of the startup bundle
const AmbientMode = lazy(() => import('../ambient/AmbientMode'));

const MainLayout = () => {
    const isPlayerOpen = usePlayerStore(state => state.isPlayerOpen);
    const location = useLocation();
    const liquidGlass = useThemeStore(state => state.liquidGlass);
    const ambientOpen = useAmbientStore(state => state.isOpen);
    const idleMinutes = useAmbientStore(state => state.idleMinutes);

    // Ambient mode: tray item, and screensaver-style auto start on system inactivity
    useEffect(() => {
        window.ipcRenderer?.invoke?.('ambient:setIdleMinutes', idleMinutes);
    }, [idleMinutes]);
    useEffect(() => {
        const offOpen = window.ipcRenderer?.on?.('ambient:open', () => useAmbientStore.getState().open());
        const offIdle = window.ipcRenderer?.on?.('ambient:idle', () => {
            const player = usePlayerStore.getState();
            const ambient = useAmbientStore.getState();
            // Only as a screensaver for music that is actually playing
            if (player.isPlaying && player.currentTrack && !ambient.isOpen) ambient.open(true);
        });
        return () => { offOpen?.(); offIdle?.(); };
    }, []);
    useWidgetBridge();
    useRadioTopUp();
    const [isMiniMode, setIsMiniMode] = useState(false);

    // Listen for tray controls
    useEffect(() => {
        const store = usePlayerStore.getState;
        const unsubPlayPause = window.ipcRenderer?.on?.('tray:playPause', () => {
            const s = store();
            if (s.isPlaying) s.pause();
            else s.play();
        });
        const unsubNext = window.ipcRenderer?.on?.('tray:next', () => store().next());
        const unsubPrev = window.ipcRenderer?.on?.('tray:prev', () => store().prev());

        // Main process pushes window state changes (replaces a 500ms IPC polling loop)
        (window as any).windowControls?.getState?.()
            .then((state: { isMiniPlayer: boolean }) => setIsMiniMode(!!state?.isMiniPlayer))
            .catch(() => { /* ignore */ });
        const unsubState = window.ipcRenderer?.on?.('window:state', (_event, state: { isMiniPlayer: boolean }) => {
            setIsMiniMode(!!state?.isMiniPlayer);
        });

        return () => {
            if (typeof unsubPlayPause === 'function') unsubPlayPause();
            if (typeof unsubNext === 'function') unsubNext();
            if (typeof unsubPrev === 'function') unsubPrev();
            if (typeof unsubState === 'function') unsubState();
        };
    }, []);

    // Layout Independence for Mini Player - Reset zoom to 1.0 when in mini mode
    useEffect(() => {
        const isLinux = (window as any).windowControls.platform === 'linux';

        if (isMiniMode) {
            // Mini player to 80% on Linux by default, 100% otherwise
            const targetZoom = isLinux ? 0.8 : 1.0;
            window.ipcRenderer?.setZoomFactor?.(targetZoom);

            const { isMiniPlayerResizable } = useSettingsStore.getState();
            window.ipcRenderer?.invoke?.('window:setMiniPlayerResizable', isMiniPlayerResizable);
        } else {
            // Restore from theme store, but default to 100% on Linux
            const zoom = useThemeStore.getState().zoomLevel;
            // On Linux, if zoom is still at its initialization default (0.8), set it to 1.0
            const finalZoom = (isLinux && (zoom === 0.8 || !zoom)) ? 1.0 : (zoom || 1.0);
            window.ipcRenderer?.setZoomFactor?.(finalZoom);
        }
    }, [isMiniMode]);

    // The Player and Toast components MUST remain at the DOM level root unconditionally
    // so React does not unmount and recreate the HTML5 Audio/Video elements when switching modes!
    return (
        <div className={clsx(
            "flex h-screen overflow-hidden relative transition-colors duration-300",
            // Mini window corners are cut round by the main process; match them here
            isMiniMode && "rounded-[18px]",
            liquidGlass
                ? (isMiniMode ? "" : "pl-3")
                : clsx("bg-background", isMiniMode ? "border-2 border-primary/50" : "border-r-4 border-l-4 border-b-4 border-primary/60")
        )}>
            {liquidGlass && <LiquidBackdrop />}
            <Toast />
            <Player />
            
            {ambientOpen && !isMiniMode && (
                <Suspense fallback={null}>
                    <AmbientMode />
                </Suspense>
            )}
            {isMiniMode ? (
                <MiniPlayer />
            ) : (
                <>
                    <BackgroundWatermarks />
                    <SidebarOverlay />
                    <AnimatePresence>
                        <NowPlaying />
                    </AnimatePresence>
                    <Sidebar />
                    <div className="flex-1 flex flex-col min-w-0 pt-[40px] relative z-[1]">
                        <div className="flex-1 overflow-y-auto no-scrollbar relative p-6">
                            <Suspense fallback={<div className="h-full w-full flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" /></div>}>
                                {/* Lightweight route transition (opacity + small lift, GPU-composited) */}
                                <motion.div
                                    key={location.pathname}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                                    className="min-h-full"
                                >
                                    <Outlet />
                                </motion.div>
                            </Suspense>
                        </div>
                        {!isPlayerOpen && <PlayerBar />}
                    </div>
                </>
            )}
        </div>
    );
};

export default MainLayout;
