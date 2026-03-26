/**
 * Video Proxy Server
 * 
 * Merges separate YouTube DASH video + audio streams in real-time using ffmpeg,
 * serving the result through a local HTTP server that the <video> element can consume.
 * 
 * This enables true 720p/1080p playback since YouTube only provides these as
 * separate video-only and audio-only DASH streams.
 */
import http from 'http';
import { spawn, ChildProcess } from 'child_process';
import { ffmpegBinaryPath, isFFmpegInstalled } from '../utils/ffmpeg-bin';

let server: http.Server | null = null;
let serverPort: number = 0;
let currentProcess: ChildProcess | null = null;
let currentVideoUrl: string = '';
let currentAudioUrl: string = '';

/**
 * Check if ffmpeg is available on the system
 */
export function isFFmpegAvailable(): boolean {
    return isFFmpegInstalled();
}

/**
 * Get the port of the running proxy server
 */
export function getProxyPort(): number {
    return serverPort;
}

/**
 * Start the local HTTP proxy server (starts once, reuses port)
 */
export async function startVideoProxyServer(): Promise<number> {
    if (server && serverPort > 0) return serverPort;

    return new Promise((resolve, reject) => {
        server = http.createServer((req, res) => {
            // Handle CORS preflight
            if (req.method === 'OPTIONS') {
                res.writeHead(200, {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Range',
                });
                res.end();
                return;
            }

            if (!currentVideoUrl || !currentAudioUrl) {
                res.writeHead(404);
                res.end('No stream configured');
                return;
            }

            // Kill any existing ffmpeg process before starting a new one
            killCurrentProcess();

            res.writeHead(200, {
                'Content-Type': 'video/x-matroska',
                'Access-Control-Allow-Origin': '*',
                'Transfer-Encoding': 'chunked',
                'Cache-Control': 'no-cache, no-store',
            });

            // Spawn ffmpeg to merge video + audio in real-time
            // Using -c copy (remux, no re-encoding) for near-instant startup
            const ffmpegArgs = [
                '-hide_banner',
                '-loglevel', 'error',
                // Video input with reconnect support for network streams
                '-reconnect', '1',
                '-reconnect_streamed', '1',
                '-reconnect_delay_max', '5',
                '-i', currentVideoUrl,
                // Audio input with reconnect support
                '-reconnect', '1',
                '-reconnect_streamed', '1',
                '-reconnect_delay_max', '5',
                '-i', currentAudioUrl,
                // Copy codecs (no re-encoding = fast)
                '-c:v', 'copy',
                '-c:a', 'copy',
                // Output as Matroska (supports all codecs) to stdout
                '-f', 'matroska',
                'pipe:1'
            ];

            console.log('[VideoProxy] Starting ffmpeg mux...');
            const ffmpeg = spawn(ffmpegBinaryPath, ffmpegArgs, {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            currentProcess = ffmpeg;

            // Pipe ffmpeg stdout directly to HTTP response
            ffmpeg.stdout.pipe(res);

            // Log ffmpeg errors
            ffmpeg.stderr.on('data', (data: Buffer) => {
                const msg = data.toString().trim();
                if (msg) console.error('[VideoProxy ffmpeg]', msg);
            });

            ffmpeg.on('close', (code) => {
                console.log(`[VideoProxy] ffmpeg exited with code ${code}`);
                if (currentProcess === ffmpeg) currentProcess = null;
                if (!res.writableEnded) res.end();
            });

            ffmpeg.on('error', (err) => {
                console.error('[VideoProxy] ffmpeg spawn error:', err);
                if (currentProcess === ffmpeg) currentProcess = null;
                if (!res.writableEnded) res.end();
            });

            // Clean up ffmpeg when client disconnects
            req.on('close', () => {
                if (currentProcess === ffmpeg) {
                    console.log('[VideoProxy] Client disconnected, killing ffmpeg');
                    try { ffmpeg.kill('SIGKILL'); } catch { /* ignore */ }
                    currentProcess = null;
                }
            });
        });

        server.listen(0, '127.0.0.1', () => {
            const addr = server!.address() as { port: number };
            serverPort = addr.port;
            console.log(`[VideoProxy] Server started on http://127.0.0.1:${serverPort}`);
            resolve(serverPort);
        });

        server.on('error', reject);
    });
}

/**
 * Configure the stream URLs for the next request
 */
export function configureStream(videoUrl: string, audioUrl: string) {
    killCurrentProcess();
    currentVideoUrl = videoUrl;
    currentAudioUrl = audioUrl;
    console.log('[VideoProxy] Stream configured');
}

/**
 * Stop any active ffmpeg process and clear stream config
 */
export function stopStream() {
    killCurrentProcess();
    currentVideoUrl = '';
    currentAudioUrl = '';
}

function killCurrentProcess() {
    if (currentProcess) {
        try { currentProcess.kill('SIGKILL'); } catch { /* ignore */ }
        currentProcess = null;
    }
}
