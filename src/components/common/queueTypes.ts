import type { Track } from '../../types/library';

export interface QueueStepProps { index: number; queue: Track[]; reorderQueue: (q: Track[]) => void; appearance: string }

export interface QueueItemProps extends Omit<QueueStepProps, 'index'> {
    track: Track;
    i: number;
    isFav: boolean;
    play: (t: Track) => void;
    removeFromQueue: (i: number) => void;
    addFavorite: (item: Track & { id: string; type: 'song' }) => void;
    removeFavorite: (id: string) => void;
}
