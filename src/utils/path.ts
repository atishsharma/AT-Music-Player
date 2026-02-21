/**
 * Converts a local file path to a safe atmusic:// URL.
 *
 * On Windows, paths use backslashes (C:\Users\...). When embedded directly
 * into a URL, the backslashes cause Electron's URL parser to misinterpret
 * the drive letter as the hostname. This helper normalises backslashes to
 * forward slashes before building the URL, which is a no-op on Linux/macOS.
 *
 * Usage:
 *   import { toAtmusicUrl } from '@/utils/path';
 *   <img src={toAtmusicUrl(track.image_path)} />
 */
export function toAtmusicUrl(filePath: string | null | undefined): string {
    if (!filePath) return '';
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;

    // If it's already an atmusic protocol string
    if (filePath.startsWith('atmusic://')) {
        // Double check it's using the robust query param approach. If not, convert it.
        if (filePath.includes('?path=')) {
            return filePath;
        } else {
            const rawPath = filePath.replace(/^atmusic:\/\//, '');
            return `atmusic://stream?path=${encodeURIComponent(rawPath)}`;
        }
    }

    // Normalize Windows backslashes → forward slashes just to be clean
    const normalized = filePath.replace(/\\/g, '/');
    return `atmusic://stream?path=${encodeURIComponent(normalized)}`;
}
