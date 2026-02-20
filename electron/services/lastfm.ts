import axios from 'axios';
import { getDB } from '../db';

const API_ROOT = 'https://ws.audioscrobbler.com/2.0/';

const getApiKey = () => {
    const db = getDB();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('lastfm_api_key') as { value: string } | undefined;
    return row ? row.value : null;
};

export const getArtistInfo = async (artist: string) => {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    try {
        const response = await axios.get(API_ROOT, {
            params: {
                method: 'artist.getinfo',
                artist,
                api_key: apiKey,
                format: 'json'
            }
        });
        return response.data.artist;
    } catch (err) {
        console.error('LastFM Artist Info Error:', err);
        return null;
    }
};

export const getAlbumInfo = async (artist: string, album: string) => {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    try {
        const response = await axios.get(API_ROOT, {
            params: {
                method: 'album.getinfo',
                artist,
                album,
                api_key: apiKey,
                format: 'json'
            }
        });
        return response.data.album;
    } catch (err) {
        console.error('LastFM Album Info Error:', err);
        return null;
    }
};
