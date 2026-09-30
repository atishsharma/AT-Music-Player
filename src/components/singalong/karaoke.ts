import { useAudioStore } from '../../store/audioStore';
import { useAmbientStore } from '../../store/ambientStore';

/** Start ambient mode as a karaoke screen: big highlighted lyrics */
export function openKaraoke() {
    const amb = useAmbientStore.getState();
    amb.set({ lyricStyle: 'karaoke', lyricScale: Math.max(amb.lyricScale, 1.25) });
    const audio = useAudioStore.getState();
    if (audio.vocalReduction === 0) audio.set({ vocalReduction: 0.8 });
    amb.open();
}
