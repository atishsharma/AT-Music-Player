import { useMemo } from 'react';
import { useThemeStore } from '../../store/themeStore';

const moodEmojis: Record<string, string[]> = {
    calm: ['🌊', '🎐', '🐚'],
    energetic: ['⚡', '🔥', '🚀'],
    focus: ['🎯', '🧠', '⏳'],
    sad: ['😢', '🌧️', '🫂'],
    party: ['🎉', '🎈', '🕺']
};

const BackgroundWatermarks = () => {
    const { currentMood, appearance, luckyTheme } = useThemeStore();
    const emojis = currentMood === 'lucky' && luckyTheme ? luckyTheme.emojis : moodEmojis[currentMood] || ['🎵'];

    const watermarks = useMemo(() => {
        const rows = 3;
        const cols = 4;
        const result: any[] = [];
        let emojiIdx = 0;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                // Calculate cell center
                const cellWidth = 100 / cols;
                const cellHeight = 100 / rows;

                // Add jitter (offset from center) but keep within cell bounds to avoid overlap
                const jitterX = (Math.random() - 0.5) * (cellWidth * 0.6);
                const jitterY = (Math.random() - 0.5) * (cellHeight * 0.6);

                const left = (c * cellWidth) + (cellWidth / 2) + jitterX;
                const top = (r * cellHeight) + (cellHeight / 2) + jitterY;

                let selectedEmoji;
                if (currentMood === 'lucky' && luckyTheme) {
                    selectedEmoji = emojis[emojiIdx % emojis.length];
                    emojiIdx++;
                } else {
                    selectedEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                }

                result.push({
                    top: `${top}%`,
                    left: `${left}%`,
                    size: `${Math.random() * 8 + 8}rem`,
                    rotate: `${Math.random() * 90 - 45}deg`,
                    emoji: selectedEmoji
                });
            }
        }

        // Shuffle the result so the order of rendering is random
        return result.sort(() => Math.random() - 0.5);
    }, [currentMood, emojis, luckyTheme]);

    let opacity = appearance === 'light' ? '0.07' : appearance === 'dark' ? '0.06' : '0.04';
    if (currentMood === 'lucky') {
        opacity = appearance === 'dark' ? '0.04' : appearance === 'oled' ? '0.02' : opacity;
    }

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none" style={{ opacity }}>
            {watermarks.map((wm, i) => (
                <div
                    key={`${currentMood}-${i}`}
                    className="absolute transition-all duration-1000 ease-in-out"
                    style={{
                        top: wm.top,
                        left: wm.left,
                        fontSize: wm.size,
                        transform: `rotate(${wm.rotate})`,
                        filter: appearance === 'light' ? 'blur(1px) contrast(1.2) brightness(0.7)' : 'blur(1px)',
                        willChange: 'transform',
                    }}
                >
                    {wm.emoji}
                </div>
            ))}
        </div>
    );
};

export default BackgroundWatermarks;
