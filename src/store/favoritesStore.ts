import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Track } from '../types/library';

/** A favourited song (full track data), album or artist */
export type FavoriteItem = Partial<Omit<Track, 'id'>> & {
    id: string;
    title?: string;
    type: 'song' | 'artist' | 'album';
};

interface FavoritesState {
    favorites: FavoriteItem[];
    addFavorite: (item: FavoriteItem) => void;
    removeFavorite: (id: string) => void;
    isFavorite: (id: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
    persist(
        (set, get) => ({
            favorites: [],
            addFavorite: (item) => {
                const { favorites } = get();
                if (!favorites.find((f) => f.id === item.id)) {
                    set({ favorites: [...favorites, item] });
                }
            },
            removeFavorite: (id) => {
                const { favorites } = get();
                set({ favorites: favorites.filter((f) => f.id !== id) });
            },
            isFavorite: (id) => {
                return get().favorites.some((f) => f.id === id);
            },
        }),
        {
            name: 'at-music-favorites',
        }
    )
);
