import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

const ASSETS_DIR = path.join(app.getPath('userData'), 'assets');

if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

export const downloadAsset = async (url: string, subDir: string, fileName: string): Promise<string | null> => {
    try {
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
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(filePath));
            writer.on('error', reject);
        });
    } catch (err) {
        console.error('Asset Download Error:', err);
        return null;
    }
};
