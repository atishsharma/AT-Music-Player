import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Mood = 'calm' | 'energetic' | 'focus' | 'sad' | 'party' | 'lucky';
export type Appearance = 'light' | 'dark' | 'oled' | 'glass';

export interface LuckyTheme {
    name: string;
    primaryColor: string;
    onPrimaryColor: string;
    emojis: string[];
}

interface ThemeState {
    currentMood: Mood;
    appearance: Appearance;
    luckyTheme: LuckyTheme | null;
    zoomLevel: number;
    setMood: (mood: Mood) => void;
    setAppearance: (appearance: Appearance) => void;
    setZoomLevel: (level: number) => void;
    generateLuckyTheme: () => void;
}

const LUCKY_COLORS = [
    '230 50 50', '210 80 40', '190 110 30', '170 140 20', '150 170 10',
    '130 200 10', '110 230 20', '90 250 40', '70 230 60', '50 210 80',
    '30 190 100', '20 170 120', '10 150 140', '10 130 160', '20 110 180',
    '40 90 200', '60 70 220', '80 50 240', '100 30 255', '120 40 230',
    '140 50 210', '160 60 190', '180 70 170', '200 80 150', '220 90 130',
    '240 100 110', '255 110 90', '230 130 70', '210 150 50', '190 170 30',
    '170 190 50', '150 210 70'
];

const EMOJI_POOL = ['🚀', '🛸', '🌌', '👾', '🌈', '🦄', '✨', '🔥', '🌊', '🌴', '🍹', '🍉', '🍕', '🍩', '🎾', '🎮', '🎸', '🎧', '📻', '📺', '📸', '💎', '🔮', '🧸', '🎈', '🎉', '🎊', '🎁', '🧨', '🧩', '🎨', '🎭', '🎪', '🎢', '🎡', '🌋', '🗻', '🏕️', '🏖️', '🏜️', '🏝️', '🏟️', '🏛️', '🏗️', '🧱', '🪵', '🛖', '🏚️', '🏠', '🏡', '🏢'];

const LUCKY_NAMES = ['Cosmic', 'Neon', 'Electric', 'Dreamy', 'Vibrant', 'Retro', 'Future', 'Mystic', 'Sunny', 'Breezy', 'Ocean', 'Forest', 'Mountain', 'Desert', 'City', 'Space', 'Magic', 'Candy', 'Pixel', 'Cyber'];

const generateLucky = (): LuckyTheme => {
    const shuffledEmojis = [...EMOJI_POOL].sort(() => Math.random() - 0.5);
    const selectedEmojis = shuffledEmojis.slice(0, 12);

    const color = LUCKY_COLORS[Math.floor(Math.random() * LUCKY_COLORS.length)];
    const name = LUCKY_NAMES[Math.floor(Math.random() * LUCKY_NAMES.length)] + ' Vibe';

    return {
        name,
        primaryColor: color,
        onPrimaryColor: '255 255 255', // Bright contrast
        emojis: selectedEmojis
    };
};

const updateBodyClass = (mood: Mood, appearance: Appearance, luckyTheme?: LuckyTheme | null) => {
    document.body.className = `mood-${mood} appearance-${appearance}`;
    if (mood === 'lucky' && luckyTheme) {
        document.body.style.setProperty('--md-sys-color-primary', luckyTheme.primaryColor);
        document.body.style.setProperty('--md-sys-color-on-primary', '255 255 255');

        if (appearance === 'light') {
            document.body.style.setProperty('--md-sys-color-background', '253 252 255');
            document.body.style.setProperty('--md-sys-color-on-background', '26 28 30');
            document.body.style.setProperty('--md-sys-color-surface', '253 252 255');
            document.body.style.setProperty('--md-sys-color-on-surface', '26 28 30');
            document.body.style.setProperty('--md-sys-color-primary-container', '212 227 255');
            document.body.style.setProperty('--md-sys-color-on-primary-container', '0 49 95');
        } else if (appearance === 'glass') {
            document.body.style.setProperty('--md-sys-color-background', '250 250 255'); // Light glass backdrop
            document.body.style.setProperty('--md-sys-color-on-background', '20 20 20'); // Dark text
            document.body.style.setProperty('--md-sys-color-surface', luckyTheme.primaryColor); // Use primary color for frost tint
            document.body.style.setProperty('--md-sys-color-on-surface', '10 10 10');
            document.body.style.setProperty('--md-sys-color-primary-container', luckyTheme.primaryColor);
            document.body.style.setProperty('--md-sys-color-on-primary-container', '255 255 255');
        } else {
            document.body.style.setProperty('--md-sys-color-primary-container', luckyTheme.primaryColor);
            document.body.style.setProperty('--md-sys-color-on-primary-container', '255 255 255');
            document.body.style.removeProperty('--md-sys-color-background');
            document.body.style.removeProperty('--md-sys-color-on-background');
            document.body.style.removeProperty('--md-sys-color-surface');
            document.body.style.removeProperty('--md-sys-color-on-surface');
        }
    } else {
        document.body.style.removeProperty('--md-sys-color-primary');
        document.body.style.removeProperty('--md-sys-color-on-primary');
        document.body.style.removeProperty('--md-sys-color-primary-container');
        document.body.style.removeProperty('--md-sys-color-on-primary-container');
        document.body.style.removeProperty('--md-sys-color-background');
        document.body.style.removeProperty('--md-sys-color-on-background');
        document.body.style.removeProperty('--md-sys-color-surface');
        document.body.style.removeProperty('--md-sys-color-on-surface');
    }
};

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            currentMood: 'party',
            appearance: 'light',
            luckyTheme: null,
            zoomLevel: 0.8,
            setZoomLevel: (level) => {
                set({ zoomLevel: level });
                if (window.ipcRenderer?.setZoomFactor) {
                    window.ipcRenderer.setZoomFactor(level);
                }
            },
            setMood: (mood) => {
                const currentAppearance = get().appearance;
                let nextAppearance = currentAppearance;
                // Disable Light theme for Lucky mood
                if (mood === 'lucky' && currentAppearance === 'light') {
                    nextAppearance = 'dark';
                    set({ appearance: 'dark' });
                }

                if (mood === 'lucky' && !get().luckyTheme) {
                    get().generateLuckyTheme();
                    return;
                }
                updateBodyClass(mood, nextAppearance, get().luckyTheme);
                set({ currentMood: mood });
            },
            setAppearance: (appearance) => {
                updateBodyClass(get().currentMood, appearance, get().luckyTheme);
                set({ appearance });
            },
            generateLuckyTheme: () => {
                const newLucky = generateLucky();
                set({ luckyTheme: newLucky, currentMood: 'lucky' });
                updateBodyClass('lucky', get().appearance, newLucky);
            }
        }),
        {
            name: 'mood-theme-storage',
            onRehydrateStorage: () => (state) => {
                if (state) {
                    updateBodyClass(state.currentMood, state.appearance, state.luckyTheme);
                    if (window.ipcRenderer?.setZoomFactor) {
                        window.ipcRenderer.setZoomFactor(state.zoomLevel ?? 0.8);
                    }
                }
            },
        }
    )
);
