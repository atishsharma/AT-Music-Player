import { create } from 'zustand';

export type SearchProvider = 'all' | 'library' | 'youtube' | 'ytmusic';

interface SearchState {
    query: string;
    lastResults: {
        library: any[];
        youtube: any[];
        ytmusic: any[];
    };
    activeProvider: SearchProvider;
    isLoading: boolean;
    offsets: Record<string, number>;

    setQuery: (query: string) => void;
    setActiveProvider: (provider: SearchProvider) => void;
    performSearch: (query: string) => Promise<void>;
    loadMore: () => Promise<void>;
}

export const useSearchStore = create<SearchState>((set, get) => ({
    query: '',
    lastResults: {
        library: [],
        youtube: [],
        ytmusic: []
    },
    activeProvider: 'all',
    isLoading: false,
    offsets: {
        youtube: 7,
        ytmusic: 0
    },

    setQuery: (query) => set({ query }),

    setActiveProvider: (activeProvider) => {
        set({ activeProvider });
    },

    performSearch: async (query: string) => {
        if (!query.trim()) return;
        set({
            isLoading: true,
            query,
            activeProvider: 'all',
            offsets: { youtube: 7, ytmusic: 0 },
            lastResults: { library: [], youtube: [], ytmusic: [] }
        });

        try {
            const results = await Promise.all([
                window.ipcRenderer.invoke('search:library', query),
                window.ipcRenderer.invoke('search:youtube', query, { limit: 7 })
            ]);

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
            set({ isLoading: false });
        }
    },

    loadMore: async () => {
        const { query, activeProvider, offsets, isLoading } = get();
        if (isLoading || !query) return;

        set({ isLoading: true });

        try {
            const providersToLoad: string[] = [];
            if (activeProvider === 'all' || activeProvider === 'youtube') providersToLoad.push('youtube');

            const newResultsData: Record<string, any[]> = {};

            await Promise.all(providersToLoad.map(async (p) => {
                const currentOffset = (offsets as any)[p] || 0;
                const newLimit = currentOffset + 10;

                const res = await window.ipcRenderer.invoke(`search:${p}`, query, { limit: newLimit });
                newResultsData[p] = res || [];
            }));

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
