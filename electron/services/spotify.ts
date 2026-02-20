import axios from 'axios';
import { getDB } from '../db';

let accessToken: string | null = null;
let tokenExpiry: number = 0;

const getApiKeys = () => {
    const db = getDB();
    const clientId = db.prepare('SELECT value FROM settings WHERE key = ?').get('spotify_client_id') as { value: string } | undefined;
    const clientSecret = db.prepare('SELECT value FROM settings WHERE key = ?').get('spotify_client_secret') as { value: string } | undefined;
    return { clientId: clientId?.value, clientSecret: clientSecret?.value };
};

const getAccessToken = async () => {
    const { clientId, clientSecret } = getApiKeys();
    if (!clientId || !clientSecret) return null;

    if (accessToken && Date.now() < tokenExpiry) return accessToken;

    try {
        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const response = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        accessToken = response.data.access_token;
        tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
        return accessToken;
    } catch (err) {
        console.error('Spotify Auth Error:', err);
        return null;
    }
};

export const searchSpotify = async (query: string, limit: number = 20, offset: number = 0) => {
    const token = await getAccessToken();
    if (!token) return [];

    try {
        const response = await axios.get('https://api.spotify.com/v1/search', {
            params: { q: query, type: 'track', limit, offset },
            headers: { 'Authorization': `Bearer ${token}` }
        });

        return response.data.tracks.items.map((item: any) => ({
            id: item.id,
            title: item.name,
            artist: item.artists.map((a: any) => a.name).join(', '),
            album: item.album.name,
            thumbnail: item.album.images[0]?.url,
            duration: Math.floor(item.duration_ms / 1000),
            source: 'spotify'
        }));
    } catch (err) {
        console.error('Spotify Search Error:', err);
        return [];
    }
};
