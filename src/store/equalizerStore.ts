import { create } from 'zustand';

export interface EQBand {
    frequency: number;
    gain: number;
    label: string;
}

export interface EQPreset {
    name: string;
    gains: number[]; // gains for each of the 10 bands
}

// 10-band EQ frequencies (standard)
export const EQ_BANDS: { frequency: number; label: string }[] = [
    { frequency: 32, label: '32' },
    { frequency: 64, label: '64' },
    { frequency: 125, label: '125' },
    { frequency: 250, label: '250' },
    { frequency: 500, label: '500' },
    { frequency: 1000, label: '1K' },
    { frequency: 2000, label: '2K' },
    { frequency: 4000, label: '4K' },
    { frequency: 8000, label: '8K' },
    { frequency: 16000, label: '16K' },
];

export const EQ_PRESETS: EQPreset[] = [
    { name: 'Flat', gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { name: 'Bass', gains: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0] },
    { name: 'Rock', gains: [5, 4, 2, 0, -1, -1, 2, 3, 4, 5] },
    { name: 'Pop', gains: [-1, 0, 2, 4, 5, 5, 3, 1, 0, -1] },
    { name: 'Custom', gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
];

interface EqualizerState {
    enabled: boolean;
    gains: number[];
    activePreset: string;
    isOpen: boolean;

    toggleEnabled: () => void;
    setGain: (index: number, gain: number) => void;
    setGains: (gains: number[]) => void;
    applyPreset: (preset: EQPreset) => void;
    toggleOpen: () => void;
    setOpen: (open: boolean) => void;
    reset: () => void;
}

export const useEqualizerStore = create<EqualizerState>((set) => ({
    enabled: false,
    gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    activePreset: 'Flat',
    isOpen: false,

    toggleEnabled: () => set((state) => ({ enabled: !state.enabled })),

    setGain: (index, gain) => set((state) => {
        const newGains = [...state.gains];
        newGains[index] = gain;
        return { gains: newGains, activePreset: 'Custom' };
    }),

    setGains: (gains) => set({ gains }),

    reset: () => set({
        enabled: false,
        gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        activePreset: 'Flat'
    }),

    applyPreset: (preset) => set({
        gains: [...preset.gains],
        activePreset: preset.name
    }),

    toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
    setOpen: (open) => set({ isOpen: open }),
}));
