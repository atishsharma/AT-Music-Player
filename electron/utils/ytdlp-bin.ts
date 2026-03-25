import { execSync, spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import { app } from 'electron';
import path from 'path';

export function getYtDlpPath(): string {
    const isWin = process.platform === 'win32';
    const binaryName = isWin ? 'yt-dlp.exe' : 'yt-dlp';

    // 1. Try system PATH first (User preference)
    try {
        const cmd = isWin ? 'where yt-dlp' : 'which yt-dlp';
        const systemPath = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).split('\n')[0].trim();
        if (systemPath && fs.existsSync(systemPath)) {
            console.log('Using system PATH yt-dlp:', systemPath);
            return systemPath;
        }
    } catch { /* ignore */ }

    // 2. Check common system paths
    const paths = isWin ? [
        path.join(process.env.APPDATA || '', 'yt-dlp.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'yt-dlp.exe'),
        'C:\\Windows\\yt-dlp.exe'
    ] : [
        '/usr/bin/yt-dlp',
        '/usr/local/bin/yt-dlp',
        '/opt/homebrew/bin/yt-dlp',
        path.join(process.env.HOME || '', '.local/bin/yt-dlp')
    ];

    for (const p of paths) {
        if (fs.existsSync(p)) {
            console.log('Using system yt-dlp:', p);
            return p;
        }
    }

    // 3. Fallback to bundled binary in production/resources
    const bundledPath = path.join(process.resourcesPath, 'bin', binaryName);
    if (fs.existsSync(bundledPath)) {
        console.log('Using bundled yt-dlp:', bundledPath);
        return bundledPath;
    }

    // 4. Check in project bin/ (for development)
    const devBinPath = path.join(app.getAppPath(), 'bin', binaryName);
    if (fs.existsSync(devBinPath)) {
        console.log('Using dev bin yt-dlp:', devBinPath);
        return devBinPath;
    }

    return binaryName; // Fallback to PATH as last resort
}

export function checkSystemYtDlp(): boolean {
    const isWin = process.platform === 'win32';
    try {
        const cmd = isWin ? 'where yt-dlp' : 'which yt-dlp';
        const systemPath = execSync(cmd, { encoding: 'utf8' }).split('\n')[0].trim();
        if (systemPath && fs.existsSync(systemPath)) return true;
    } catch { /* ignore */ }

    const paths = isWin ? [
        path.join(process.env.APPDATA || '', 'yt-dlp.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'yt-dlp.exe'),
        'C:\\Windows\\yt-dlp.exe'
    ] : [
        '/usr/bin/yt-dlp',
        '/usr/local/bin/yt-dlp',
        '/opt/homebrew/bin/yt-dlp',
        path.join(process.env.HOME || '', '.local/bin/yt-dlp')
    ];

    for (const p of paths) {
        if (fs.existsSync(p)) return true;
    }
    return false;
}

export const ytDlpBinaryPath = getYtDlpPath();

/**
 * Execute yt-dlp directly using system spawn
 */
export function execYtDlp(args: string[]): ChildProcess {
    console.log(`Executing: ${ytDlpBinaryPath} ${args.join(' ')}`);
    return spawn(ytDlpBinaryPath, args);
}

/**
 * Execute yt-dlp and return JSON output
 */
export async function execYtDlpJson(args: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
        const subprocess = spawn(ytDlpBinaryPath, [...args, '--dump-json', '--no-warnings']);
        let stdout = '';
        let stderr = '';

        subprocess.stdout.on('data', (data) => stdout += data.toString());
        subprocess.stderr.on('data', (data) => stderr += data.toString());

        subprocess.on('close', (code) => {
            if (code === 0) {
                try {
                    resolve(JSON.parse(stdout));
                } catch (e) {
                    // yt-dlp might output multiple JSON objects for playlists
                    try {
                        const lines = stdout.trim().split('\n');
                        if (lines.length > 1) {
                            resolve({ entries: lines.map(l => JSON.parse(l)) });
                        } else {
                            reject(new Error('Failed to parse yt-dlp output'));
                        }
                    } catch (err) {
                        reject(err);
                    }
                }
            } else {
                reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
            }
        });
    });
}

