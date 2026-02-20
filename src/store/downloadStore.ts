import { create } from 'zustand';

export interface DownloadItem {
    id: string;
    title?: string;
    state: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    error?: string;
}

interface DownloadState {
    downloads: Record<string, DownloadItem>;
    setDownload: (item: DownloadItem) => void;
    removeDownload: (id: string) => void;
}

export const useDownloadStore = create<DownloadState>((set) => ({
    downloads: {},
    setDownload: (item) => set((state) => ({
        downloads: {
            ...state.downloads,
            [item.id]: { ...(state.downloads[item.id] || {}), ...item }
        }
    })),
    removeDownload: (id) => set((state) => {
        const newDownloads = { ...state.downloads };
        delete newDownloads[id];
        return { downloads: newDownloads };
    })
}));
