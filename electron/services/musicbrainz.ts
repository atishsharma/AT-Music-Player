import axios from 'axios';

const MB_API_URL = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'ATMusicPro/1.1.1 ( contact@atmusic.pro )';

const client = axios.create({
    baseURL: MB_API_URL,
    headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
    }
});

export interface MBArtist {
    id: string;
    name: string;
    'sort-name': string;
    type: string;
    gender: string;
    country: string;
    'life-span': {
        begin: string;
        end: string;
    };
    tags: Array<{ count: number; name: string }>;
}

export const searchArtists = async (query: string): Promise<MBArtist[]> => {
    try {
        const response = await client.get('/artist', {
            params: {
                query: query,
                fmt: 'json'
            }
        });
        return response.data.artists || [];
    } catch (error) {
        console.error('MB Search Error:', error);
        return [];
    }
};

export const getArtistById = async (mbid: string) => {
    try {
        const response = await client.get(`/artist/${mbid}`, {
            params: {
                inc: 'url-rels+releases+artist-rels',
                fmt: 'json'
            }
        });
        return response.data;
    } catch (error) {
        console.error('MB Get Artist Error:', error);
        return null;
    }
};

export const getArtistImage = async (_mbid: string): Promise<string | null> => {
    return null;
}

export const getAlbumById = async (mbid: string) => {
    try {
        const response = await client.get(`/release/${mbid}`, {
            params: {
                inc: 'recordings+artists',
                fmt: 'json'
            }
        });
        return response.data;
    } catch (error) {
        console.error('MB Get Album Error:', error);
        return null;
    }
};

export const getCoverArt = async (mbid: string): Promise<string | null> => {
    try {
        const url = `https://coverartarchive.org/release/${mbid}/front`;
        await axios.head(url);
        return url;
    } catch (error) {
        return null;
    }
}
