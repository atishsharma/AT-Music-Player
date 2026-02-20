import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';

const Toast = () => {
    const [messages, setMessages] = useState<{ id: number; text: string }[]>([]);

    const showToast = useCallback((text: string) => {
        const id = Date.now();
        setMessages(prev => [...prev, { id, text }]);
        setTimeout(() => {
            setMessages(prev => prev.filter(msg => msg.id !== id));
        }, 3000);
    }, []);

    useEffect(() => {
        (window as any).showToast = showToast;
        return () => {
            delete (window as any).showToast;
        };
    }, [showToast]);

    return (
        <div className="fixed bottom-28 right-8 z-[300] flex flex-col gap-3 pointer-events-none">
            <AnimatePresence>
                {messages.map((msg) => (
                    <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, x: 50, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        className="bg-primary/95 backdrop-blur-xl border border-white/20 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[300px] pointer-events-auto"
                    >
                        <div className="p-2 bg-white/20 rounded-xl text-white">
                            <CheckCircle2 size={20} />
                        </div>
                        <p className="text-sm font-black text-white tracking-tight flex-1">
                            {msg.text}
                        </p>
                        <button
                            onClick={() => setMessages(prev => prev.filter(m => m.id !== msg.id))}
                            className="p-1 text-white/40 hover:text-white transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default Toast;
