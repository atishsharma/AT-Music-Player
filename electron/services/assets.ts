import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export const downloadAsset = async (url: string, subDir: string, fileName: string): Promise<string | null> => {
    try {
        // Resolve ASSETS_DIR lazily (app must be ready before calling app.getPath)
        const ASSETS_DIR = path.join(app.getPath('userData'), 'assets');

        // Sanitize filename
        const sanitizedFileName = fileName.replace(/[<>:"/\\|?*]/g, '_');
        const targetDir = path.join(ASSETS_DIR, subDir);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const filePath = path.join(targetDir, sanitizedFileName);

        // Skip if already exists
        if (fs.existsSync(filePath)) {
            return filePath;
        }

        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
            timeout: 15000
        });

        // Write to a temp file and rename on success, so a failed/partial download
        // is never mistaken for a cached asset on the next call.
        const tempPath = `${filePath}.part`;
        const writer = fs.createWriteStream(tempPath);
        response.data.pipe(writer);

        return await new Promise<string | null>((resolve) => {
            const fail = (err: unknown) => {
                console.error('Asset Download Error:', err);
                writer.destroy();
                fs.rm(tempPath, { force: true }, () => resolve(null));
            };
            response.data.on('error', fail);
            writer.on('error', fail);
            writer.on('finish', () => {
                fs.rename(tempPath, filePath, (err) => err ? fail(err) : resolve(filePath));
            });
        });
    } catch (err) {
        console.error('Asset Download Error:', err);
        return null;
    }
};
