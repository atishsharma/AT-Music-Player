
import { Outlet } from 'react-router-dom';
import clsx from 'clsx';
import Sidebar from './Sidebar';
import PlayerBar from './PlayerBar';

import Player from '../common/Player';
import NowPlaying from '../common/NowPlaying';
import MiniPlayer from '../common/MiniPlayer';
import { AnimatePresence } from 'framer-motion';

import BackgroundWatermarks from '../common/BackgroundWatermarks';

import SidebarOverlay from '../common/SidebarOverlay';
import { usePlayerStore } from '../../store/playerStore';
import { useThemeStore } from '../../store/themeStore';
import { useSettingsStore } from '../../store/settingsStore';
import Toast from '../common/Toast';
import { useState, useEffect } from 'react';

const MainLayout = () => {
    const isPlayerOpen = usePlayerStore(state => state.isPlayerOpen);
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

        // Check if we're in mini player mode 
        const checkMiniMode = async () => {
            try {
                const isMini = await (window as any).windowControls.isMiniPlayer();
                setIsMiniMode(isMini);
            } catch { /* ignore */ }
        };
        checkMiniMode();

        // Poll for window size changes to detect mini mode toggle
        const interval = setInterval(checkMiniMode, 500);

        return () => {
            if (typeof unsubPlayPause === 'function') unsubPlayPause();
            if (typeof unsubNext === 'function') unsubNext();
            if (typeof unsubPrev === 'function') unsubPrev();
            clearInterval(interval);
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
            "flex h-screen bg-background overflow-hidden relative transition-all duration-300",
            isMiniMode ? "border-x-4 border-b-4 border-primary/60" : "border-r-4 border-l-4 border-b-4 border-primary/60"
        )}>
            <Toast />
            <Player />
            
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
                    <div className="flex-1 flex flex-col min-w-0 pt-[40px]">
                        <div className="flex-1 overflow-y-auto no-scrollbar relative p-6">
                            <Outlet />
                        </div>
                        {!isPlayerOpen && <PlayerBar />}
                    </div>
                </>
            )}
        </div>
    );
};

export default MainLayout;
