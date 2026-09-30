import net from 'node:net';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * Minimal Discord Rich Presence client over Discord's local IPC socket
 * (no dependency). Frames are: int32 LE opcode, int32 LE length, JSON body.
 */

const OP_HANDSHAKE = 0;
const OP_FRAME = 1;
const OP_CLOSE = 2;
const OP_PING = 3;
const OP_PONG = 4;

export interface Presence {
    title: string;
    artist: string;
    album?: string;
    /** Seconds */
    duration?: number;
    position?: number;
    isPlaying: boolean;
    /** https artwork URL (Discord can't show local files) */
    artwork?: string;
}

function socketPaths(): string[] {
    if (process.platform === 'win32') return Array.from({ length: 10 }, (_, i) => `\\\\?\\pipe\\discord-ipc-${i}`);
    const base = process.env.XDG_RUNTIME_DIR || process.env.TMPDIR || process.env.TMP || process.env.TEMP || '/tmp';
    // Regular, Flatpak and Snap installs put the socket in different places
    const dirs = [base, path.join(base, 'app/com.discordapp.Discord'), path.join(base, 'snap.discord'), path.join(base, '.flatpak/dev.vencord.Vesktop/xdg-run'), '/tmp'];
    return [...new Set(dirs)].flatMap(d => Array.from({ length: 10 }, (_, i) => path.join(d, `discord-ipc-${i}`)));
}

function encode(op: number, data: unknown) {
    const body = Buffer.from(JSON.stringify(data));
    const head = Buffer.alloc(8);
    head.writeInt32LE(op, 0);
    head.writeInt32LE(body.length, 4);
    return Buffer.concat([head, body]);
}

const clip = (s: string | undefined, n = 128) => {
    const t = (s || '').trim();
    if (t.length >= 2) return t.length > n ? t.slice(0, n - 1) + '…' : t;
    return t ? t + '  ' : undefined; // Discord rejects 1-char strings
};

export class DiscordPresence {
    private socket: net.Socket | null = null;
    private ready = false;
    private connecting = false;
    private clientId = '';
    private pending: Presence | null | undefined;
    private retry: NodeJS.Timeout | null = null;
    private buf = Buffer.alloc(0);
    enabled = false;

    get connected() { return this.ready; }

    start(clientId: string) {
        this.enabled = true;
        if (clientId !== this.clientId) this.disconnect();
        this.clientId = clientId;
        this.connect();
    }

    stop() {
        this.enabled = false;
        if (this.ready) this.send(OP_FRAME, { cmd: 'SET_ACTIVITY', args: { pid: process.pid, activity: null }, nonce: randomUUID() });
        this.disconnect();
    }

    update(p: Presence | null) {
        this.pending = p;
        if (this.ready) this.flush();
        else if (this.enabled) this.connect();
    }

    private async connect() {
        if (!this.enabled || !/^\d{15,22}$/.test(this.clientId) || this.ready || this.connecting) return;
        this.connecting = true;
        for (const p of socketPaths()) {
            const sock = await new Promise<net.Socket | null>((resolve) => {
                const s = net.createConnection(p);
                s.once('connect', () => resolve(s));
                s.once('error', () => { s.destroy(); resolve(null); });
            });
            if (!sock) continue;
            this.socket = sock;
            sock.on('data', (d) => this.onData(Buffer.from(d)));
            sock.on('close', () => this.onClose());
            sock.on('error', () => { /* close follows */ });
            sock.write(encode(OP_HANDSHAKE, { v: 1, client_id: this.clientId }));
            this.connecting = false;
            return;
        }
        this.connecting = false;
        this.scheduleRetry(); // Discord not running
    }

    private onData(chunk: Buffer) {
        this.buf = Buffer.concat([this.buf, chunk]);
        while (this.buf.length >= 8) {
            const op = this.buf.readInt32LE(0);
            const len = this.buf.readInt32LE(4);
            if (this.buf.length < 8 + len) return;
            let msg: { cmd?: string; evt?: string } = {};
            try { msg = JSON.parse(this.buf.subarray(8, 8 + len).toString()); } catch { /* ignore */ }
            this.buf = this.buf.subarray(8 + len);
            if (op === OP_PING) this.send(OP_PONG, msg);
            else if (op === OP_CLOSE) this.disconnect();
            else if (msg.cmd === 'DISPATCH' && msg.evt === 'READY') {
                this.ready = true;
                this.flush();
            }
        }
    }

    private onClose() {
        this.ready = false;
        this.socket = null;
        this.buf = Buffer.alloc(0);
        this.scheduleRetry();
    }

    private scheduleRetry() {
        if (!this.enabled || this.retry) return;
        this.retry = setTimeout(() => { this.retry = null; this.connect(); }, 20_000);
    }

    private disconnect() {
        if (this.retry) { clearTimeout(this.retry); this.retry = null; }
        this.ready = false;
        this.socket?.removeAllListeners('close');
        this.socket?.destroy();
        this.socket = null;
    }

    private send(op: number, data: unknown) {
        try { this.socket?.write(encode(op, data)); } catch { /* socket gone */ }
    }

    private flush() {
        if (this.pending === undefined) return;
        const p = this.pending;
        this.pending = undefined;
        let activity: Record<string, unknown> | null = null;
        if (p && p.title) {
            const now = Date.now();
            activity = {
                type: 2, // "Listening to"
                details: clip(p.title),
                state: clip(`${p.isPlaying ? '' : 'Paused · '}${p.artist ? `by ${p.artist}` : ''}`),
                assets: {
                    large_image: p.artwork && /^https:\/\//.test(p.artwork) && p.artwork.length < 256 ? p.artwork : undefined,
                    large_text: clip(p.album || p.title),
                },
                timestamps: p.isPlaying && p.duration
                    ? { start: now - (p.position || 0) * 1000, end: now + Math.max(0, p.duration - (p.position || 0)) * 1000 }
                    : undefined,
                instance: false,
            };
        }
        this.send(OP_FRAME, { cmd: 'SET_ACTIVITY', args: { pid: process.pid, activity }, nonce: randomUUID() });
    }
}
