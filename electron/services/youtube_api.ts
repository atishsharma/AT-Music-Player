import axios from 'axios';
import { getDB } from '../db';

const getApiKey = () => {
    const db = getDB();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('youtube_api_key') as { value: string } | undefined;
    return row ? row.value : null;
};

export const searchYouTubeAPI = async (query: string) => {
    const apiKey = getApiKey();
    if (!apiKey) return [];

    try {
        const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
            params: {
                part: 'snippet',
                q: query,
                type: 'video',
                maxResults: 20,
                key: apiKey
            }
        });

        return response.data.items.map((item: any) => ({
            id: item.id.videoId,
            title: item.snippet.title,
            artist: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails.high?.url,
            source: 'youtube'
        }));
    } catch (err) {
        console.error('YouTube API Search Error:', err);
        return [];
    }
};
