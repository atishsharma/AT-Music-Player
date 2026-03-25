
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
import Toast from '../common/Toast';
import { useState, useEffect } from 'react';

const MainLayout = () => {
    const isPlayerOpen = usePlayerStore(state => state.isPlayerOpen);
    const [isMiniMode, setIsMiniMode] = useState(false);

    // Listen for tray controls
    useEffect(() => {
        const store = usePlayerStore.getState;
        const unsubPlayPause = window.ipcRenderer.on('tray:playPause', () => {
            const s = store();
            if (s.isPlaying) s.pause();
            else s.play();
        });
        const unsubNext = window.ipcRenderer.on('tray:next', () => store().next());
        const unsubPrev = window.ipcRenderer.on('tray:prev', () => store().prev());

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

    // The Player and Toast components MUST remain at the DOM level root unconditionally
    // so React does not unmount and recreate the HTML5 Audio/Video elements when switching modes!
    return (
        <div className={clsx(
            "flex h-screen bg-background overflow-hidden relative transition-all duration-300",
            isMiniMode ? "border-2 border-primary/40 rounded-xl" : "border-t-4 border-r-4 border-l-4 border-b-4 border-primary/60"
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
                    <div className="flex-1 flex flex-col min-w-0">
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
