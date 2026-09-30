import { create } from 'zustand';
import type { Track } from '../types/library';

export type SearchProvider = 'all' | 'library' | 'youtube' | 'ytmusic';

interface SearchState {
    query: string;
    lastResults: {
        library: Track[];
        youtube: Track[];
        ytmusic: Track[];
    };
    activeProvider: SearchProvider;
    isLoading: boolean;
    offsets: Record<string, number>;

    setQuery: (query: string) => void;
    setActiveProvider: (provider: SearchProvider) => void;
    performSearch: (query: string) => Promise<void>;
    loadMore: () => Promise<void>;
    clearSearch: () => void;
}

let searchToken = 0;

export const useSearchStore = create<SearchState>((set, get) => ({
    query: '',
    lastResults: {
        library: [],
        youtube: [],
        ytmusic: []
    },
    activeProvider: 'youtube',
    isLoading: false,
    offsets: {
        youtube: 7,
        ytmusic: 0
    },

    setQuery: (query) => set({ query }),

    setActiveProvider: (activeProvider) => {
        set({ activeProvider });
        // Optionally if we want to run search upon provider switch? The user asked to only search in library when clicking on it.
        // Actually, if a query exists, it should probably search again using the new tab or we just re-run search.
        const currentQuery = get().query;
        if (currentQuery) {
            get().performSearch(currentQuery);
        }
    },

    clearSearch: () => {
        set({
            query: '',
            lastResults: { library: [], youtube: [], ytmusic: [] },
            isLoading: false
        });
    },

    performSearch: async (query: string) => {
        if (!query.trim()) return;
        // A slower, older search must not overwrite the results of a newer one
        const token = ++searchToken;
        set({
            isLoading: true,
            query,
            offsets: { youtube: 7, ytmusic: 0 },
            lastResults: { library: [], youtube: [], ytmusic: [] }
        });

        try {
            const activeProvider = get().activeProvider;
            const results = await Promise.all([
                activeProvider === 'library' ? window.ipcRenderer.invoke('search:library', query) : Promise.resolve([]),
                activeProvider === 'youtube' ? window.ipcRenderer.invoke('search:youtube', query, { limit: 7 }) : Promise.resolve([])
            ]);

            if (token !== searchToken) return;
            set({
                lastResults: {
                    library: results[0] || [],
                    youtube: results[1] || [],
                    ytmusic: []
                }
            });
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            if (token === searchToken) set({ isLoading: false });
        }
    },

    loadMore: async () => {
        const { query, activeProvider, offsets, isLoading } = get();
        if (isLoading || !query) return;

        set({ isLoading: true });

        try {
            const providersToLoad: string[] = [];
            if (activeProvider === 'all' || activeProvider === 'youtube') providersToLoad.push('youtube');

            const newResultsData: Record<string, Track[]> = {};
            const token = searchToken;

            await Promise.all(providersToLoad.map(async (p) => {
                const currentOffset = offsets[p] || 0;
                const newLimit = currentOffset + 10;

                const res = await window.ipcRenderer.invoke(`search:${p}`, query, { limit: newLimit });
                newResultsData[p] = res || [];
            }));

            if (token !== searchToken) { set({ isLoading: false }); return; }
            set((state) => {
                const nextResults = { ...state.lastResults };
                const nextOffsets = { ...state.offsets };

                providersToLoad.forEach(() => {
                    nextResults.youtube = newResultsData.youtube;
                    nextOffsets.youtube = nextResults.youtube.length;
                });

                return { lastResults: nextResults, offsets: nextOffsets, isLoading: false };
            });

        } catch (err) {
            console.error('Load more failed:', err);
            set({ isLoading: false });
        }
    }
}));
