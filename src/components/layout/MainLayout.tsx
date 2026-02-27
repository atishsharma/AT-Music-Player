
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import PlayerBar from './PlayerBar';

import Player from '../common/Player';
import NowPlaying from '../common/NowPlaying';
import { AnimatePresence } from 'framer-motion';

import BackgroundWatermarks from '../common/BackgroundWatermarks';

import SidebarOverlay from '../common/SidebarOverlay';
import { usePlayerStore } from '../../store/playerStore';
import Toast from '../common/Toast';

const MainLayout = () => {
    const isPlayerOpen = usePlayerStore(state => state.isPlayerOpen);
    return (
        <div className="flex h-screen bg-background overflow-hidden relative border-t-4 border-r-4 border-l-4 border-b-4 border-primary/60">
            <Toast />
            <BackgroundWatermarks />
            <SidebarOverlay />
            <Player />
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
        </div>
    );
};

export default MainLayout;
