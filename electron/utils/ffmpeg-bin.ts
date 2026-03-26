import { execSync } from 'child_process';
import fs from 'fs';
import { app } from 'electron';
import path from 'path';

export function getFFmpegPath(): string {
    const isWin = process.platform === 'win32';
    const binaryName = isWin ? 'ffmpeg.exe' : 'ffmpeg';

    // 1. Try system PATH first
    try {
        const cmd = isWin ? 'where ffmpeg' : 'which ffmpeg';
        const systemPath = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).split('\n')[0].trim();
        if (systemPath && fs.existsSync(systemPath)) {
            console.log('Using system PATH ffmpeg:', systemPath);
            return systemPath;
        }
    } catch { /* ignore */ }

    // 2. Check common system paths
    const paths = isWin ? [
        path.join(process.env.LOCALAPPDATA || '', 'ffmpeg', 'bin', 'ffmpeg.exe'),
        'C:\\ffmpeg\\bin\\ffmpeg.exe',
    ] : [
        '/usr/bin/ffmpeg',
        '/usr/local/bin/ffmpeg',
        '/opt/homebrew/bin/ffmpeg',
        path.join(process.env.HOME || '', '.local/bin/ffmpeg'),
    ];

    for (const p of paths) {
        if (fs.existsSync(p)) {
            console.log('Using system ffmpeg:', p);
            return p;
        }
    }

    // 3. Check bundled binary in resources (production)
    const bundledPath = path.join(process.resourcesPath, 'bin', binaryName);
    if (fs.existsSync(bundledPath)) {
        console.log('Using bundled ffmpeg:', bundledPath);
        return bundledPath;
    }

    // 4. Check project bin/ directory (development fallback)
    const devBinPath = path.join(app.getAppPath(), 'bin', binaryName);
    if (fs.existsSync(devBinPath)) {
        console.log('Using dev bin ffmpeg:', devBinPath);
        return devBinPath;
    }

    return binaryName; // Fallback to PATH
}

export function isFFmpegInstalled(): boolean {
    try {
        const ffmpegPath = getFFmpegPath();
        execSync(`"${ffmpegPath}" -version`, { encoding: 'utf8', stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

export const ffmpegBinaryPath = getFFmpegPath();
