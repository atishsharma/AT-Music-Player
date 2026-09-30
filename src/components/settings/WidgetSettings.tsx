import { useEffect, useState } from 'react';
import { AppWindow, Cpu, Pin, MonitorPlay } from 'lucide-react';
import { useAmbientStore, AMBIENT_SCENES } from '../../store/ambientStore';
import clsx from 'clsx';

type WidgetStyle = 'pill' | 'card' | 'orb';

const STYLES: { id: WidgetStyle; label: string; hint: string }[] = [
    { id: 'pill', label: 'Pill', hint: 'Compact bar' },
    { id: 'card', label: 'Card', hint: 'Artwork + controls' },
    { id: 'orb', label: 'Orb', hint: 'Spinning disc' },
];

const Toggle = ({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) => (
    <button
        onClick={onClick}
        className={clsx(
            "w-full px-6 py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-xs transition-all flex items-center justify-between",
            on ? "bg-primary text-on-primary shadow-lg shadow-primary/40" : "bg-surface-variant/5 text-on-surface-variant border border-white/10 hover:bg-surface-variant/30"
        )}
    >
        <span>{label}</span>
        <span className={clsx("relative w-10 h-6 rounded-full transition-colors", on ? "bg-on-primary/30" : "bg-on-surface-variant/20")}>
            <span className={clsx("absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)]", on && "translate-x-4")} />
        </span>
    </button>
);

const WidgetSettings = () => {
    const [enabled, setEnabled] = useState(true);
    const [alwaysOnTop, setAlwaysOnTop] = useState(true);
    const [style, setStyle] = useState<WidgetStyle>('pill');
    const [hwAccel, setHwAccel] = useState<boolean | null>(null);
    const [hwChanged, setHwChanged] = useState(false);

    useEffect(() => {
        window.ipcRenderer.invoke('widget:getConfig').then((c) => {
            if (!c) return;
            setEnabled(c.enabled);
            setAlwaysOnTop(c.alwaysOnTop);
            setStyle(c.style);
        });
        window.ipcRenderer.invoke('app:getHardwareAcceleration').then(setHwAccel);
    }, []);

    return (
        <div className="lg:col-span-2 bg-surface-variant/20 backdrop-blur-xl rounded-[3rem] p-10 border border-outline/10 space-y-8 mt-8">
            <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-[1.5rem]">
                    <AppWindow className="text-primary" size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-on-surface">Desktop Widget</h2>
                    <p className="text-xs text-on-surface-variant/60 font-bold uppercase tracking-widest">Shown when the app is minimized to the taskbar</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Toggle
                    on={enabled}
                    label="Widget on minimize"
                    onClick={async () => setEnabled(await window.ipcRenderer.invoke('widget:setEnabled', !enabled))}
                />
                <Toggle
                    on={alwaysOnTop}
                    label="Always on top"
                    onClick={async () => setAlwaysOnTop(await window.ipcRenderer.invoke('widget:setAlwaysOnTop', !alwaysOnTop))}
                />
            </div>

            <div className="grid grid-cols-3 gap-4">
                {STYLES.map((s) => (
                    <button
                        key={s.id}
                        onClick={async () => {
                            await window.ipcRenderer.invoke('widget:setStyle', s.id);
                            setStyle(s.id);
                        }}
                        className={clsx(
                            "rounded-[1.5rem] p-5 text-left border transition-all duration-300 hover:-translate-y-0.5",
                            style === s.id ? "border-primary bg-primary/10 shadow-lg shadow-primary/20" : "border-white/10 bg-surface-variant/5 hover:bg-surface-variant/20"
                        )}
                    >
                        <p className="font-black text-on-surface">{s.label}</p>
                        <p className="text-[11px] text-on-surface-variant/70 font-bold uppercase tracking-widest">{s.hint}</p>
                    </button>
                ))}
            </div>

            <div className="flex flex-wrap gap-4">
                <button
                    onClick={() => window.ipcRenderer.invoke('widget:preview')}
                    className="px-6 py-3 rounded-full bg-primary text-on-primary font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform"
                >
                    <Pin size={14} /> Show widget now
                </button>
            </div>

            {hwAccel !== null && (
                <div className="pt-6 border-t border-white/5 space-y-3">
                    <div className="flex items-center gap-3">
                        <Cpu className="text-primary" size={20} />
                        <h3 className="font-black text-on-surface">GPU acceleration</h3>
                    </div>
                    <p className="text-xs text-on-surface-variant/70">Smoother animations, blur and visualizers. Disable if you see a blank window (some Linux drivers).</p>
                    <Toggle
                        on={hwAccel}
                        label={hwChanged ? 'Restart app to apply' : 'Hardware acceleration'}
                        onClick={async () => {
                            setHwAccel(await window.ipcRenderer.invoke('app:setHardwareAcceleration', !hwAccel));
                            setHwChanged(true);
                        }}
                    />
                </div>
            )}
        </div>
    );
};

const IDLE_OPTIONS = [0, 2, 5, 10, 20];

export const AmbientSettingsCard = () => {
    const { scene, idleMinutes, fullScreen, keepAwake, set, open } = useAmbientStore();
    return (
        <div className="lg:col-span-2 bg-surface-variant/20 backdrop-blur-xl rounded-[3rem] p-10 border border-outline/10 space-y-8 mt-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-primary/10 rounded-[1.5rem]">
                        <MonitorPlay className="text-primary" size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-on-surface">Ambient Mode</h2>
                        <p className="text-xs text-on-surface-variant/60 font-bold uppercase tracking-widest">Full-screen lyrics and slow backgrounds, like a screensaver</p>
                    </div>
                </div>
                <button
                    onClick={() => open()}
                    className="px-6 py-3 rounded-full bg-primary text-on-primary font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform"
                >
                    <MonitorPlay size={14} /> Open now
                </button>
            </div>

            <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant/70">Start automatically when idle (music playing)</p>
                <div className="flex flex-wrap gap-2">
                    {IDLE_OPTIONS.map(m => (
                        <button
                            key={m}
                            onClick={() => set({ idleMinutes: m })}
                            className={clsx(
                                "px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all",
                                idleMinutes === m ? "bg-primary text-on-primary shadow-lg shadow-primary/30" : "bg-surface-variant/10 border border-white/10 text-on-surface-variant hover:bg-surface-variant/30"
                            )}
                        >
                            {m === 0 ? 'Never' : `${m} min`}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant/70">Default scene</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {AMBIENT_SCENES.map(s => (
                        <button
                            key={s}
                            onClick={() => set({ scene: s })}
                            className={clsx(
                                "rounded-[1.25rem] p-4 text-left border transition-all duration-300 hover:-translate-y-0.5 font-black capitalize",
                                scene === s ? "border-primary bg-primary/10 text-on-surface shadow-lg shadow-primary/20" : "border-white/10 bg-surface-variant/5 text-on-surface-variant hover:bg-surface-variant/20"
                            )}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Toggle on={fullScreen} label="Full screen when opened" onClick={() => set({ fullScreen: !fullScreen })} />
                <Toggle on={keepAwake} label="Keep screen on while playing" onClick={() => set({ keepAwake: !keepAwake })} />
            </div>
        </div>
    );
};

export default WidgetSettings;
