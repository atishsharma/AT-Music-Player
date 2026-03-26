import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { useEqualizerStore, EQ_BANDS } from '../../store/equalizerStore';


const Player = () => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const {
        currentTrack,
        isPlaying,
        volume,
        pause,
        play,
        prev,
        next,
        lastSeekTime,
        currentTime
    } = usePlayerStore();
    const { gains, enabled } = useEqualizerStore();
    const [streamUrl, setStreamUrl] = useState<string>('');
    const analyserRef = useRef<AnalyserNode | null>(null);
    const eqFiltersRef = useRef<BiquadFilterNode[]>([]);
    const spotifyPlayerRef = useRef<any>(null);
    const [isSpotifyReady, setIsSpotifyReady] = useState(false);

    useEffect(() => {
        // Reset EQ on each song change
        useEqualizerStore.getState().reset();
        
        // Clear stream URL immediately to stop previous playback
        setStreamUrl('');

        const fetchStream = async () => {
            if (!currentTrack) {
                return;
            }

            if (currentTrack.path) {
                // Check if it's a URL (http/https) first (could be from some stream source)
                if (currentTrack.path.startsWith('http://') || currentTrack.path.startsWith('https://')) {
                    setStreamUrl(currentTrack.path);
                } else {
                    const encodedPath = currentTrack.path;
                    if (encodedPath.startsWith('atmusic://stream?path=')) {
                        setStreamUrl(encodedPath);
                    } else if (encodedPath.startsWith('atmusic://')) {
                        const rawPath = encodedPath.replace(/^atmusic:\/\//, '');
                        setStreamUrl(`atmusic://stream?path=${encodeURIComponent(rawPath)}`);
                    } else {
                        const normalized = encodedPath.replace(/\\/g, '/');
                        setStreamUrl(`atmusic://stream?path=${encodeURIComponent(normalized)}`);
                    }
                }
            } else if ((currentTrack.source === 'youtube' || currentTrack.source === 'ytmusic') && currentTrack.id) {
                try {
                    const data = await window.ipcRenderer.invoke('youtube:stream', currentTrack.id);
                    if (data && data.url) {
                        setStreamUrl(data.url);
                    } else {
                        console.error('Failed to get stream URL');
                        pause();
                    }
                } catch (err) {
                    console.error('Error fetching stream:', err);
                    pause();
                }
            }
        };

        fetchStream();

        if (currentTrack) {
            window.ipcRenderer.invoke('library:markPlayed', currentTrack);

            if ('mediaSession' in navigator) {
                // Ensure image path is properly formatted for remote or local resources
                let artworkUrl = currentTrack.image_path || currentTrack.thumbnail || '';
                if (artworkUrl && !artworkUrl.startsWith('http')) {
                    artworkUrl = `atmusic://stream?path=${encodeURIComponent(artworkUrl.replace(/\\/g, '/'))}`;
                }

                navigator.mediaSession.metadata = new MediaMetadata({
                    title: currentTrack.title || 'Unknown Title',
                    artist: currentTrack.artist || 'Unknown Artist',
                    album: currentTrack.album || 'Unknown Album',
                    artwork: artworkUrl ? [{ src: artworkUrl, sizes: '512x512' }] : []
                });

                navigator.mediaSession.setActionHandler('play', () => play());
                navigator.mediaSession.setActionHandler('pause', () => pause());
                navigator.mediaSession.setActionHandler('previoustrack', () => prev());
                navigator.mediaSession.setActionHandler('nexttrack', () => next());
                navigator.mediaSession.setActionHandler('seekto', (details) => {
                    const seekTime = details.seekTime || 0;
                    if (audioRef.current) audioRef.current.currentTime = seekTime;
                    usePlayerStore.getState().seek(seekTime);
                });
                navigator.mediaSession.setActionHandler('seekbackward', (details) => {
                    const skipTime = details.seekOffset || 10;
                    const newTime = Math.max((audioRef.current?.currentTime || 0) - skipTime, 0);
                    if (audioRef.current) audioRef.current.currentTime = newTime;
                    usePlayerStore.getState().seek(newTime);
                });
                navigator.mediaSession.setActionHandler('seekforward', (details) => {
                    const skipTime = details.seekOffset || 10;
                    const newTime = Math.min((audioRef.current?.currentTime || 0) + skipTime, audioRef.current?.duration || 0);
                    if (audioRef.current) audioRef.current.currentTime = newTime;
                    usePlayerStore.getState().seek(newTime);
                });
            }
        }
    }, [currentTrack]);

    useEffect(() => {
        if (!audioRef.current || analyserRef.current) return;

        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaElementSource(audioRef.current);

            // Create 10-band EQ filter chain
            const filters: BiquadFilterNode[] = EQ_BANDS.map((band, index) => {
                const filter = audioContext.createBiquadFilter();
                if (index === 0) {
                    filter.type = 'lowshelf';
                } else if (index === EQ_BANDS.length - 1) {
                    filter.type = 'highshelf';
                } else {
                    filter.type = 'peaking';
                }
                filter.frequency.value = band.frequency;
                filter.gain.value = 0;
                filter.Q.value = 1.4;
                return filter;
            });

            // Chain: source -> filter[0] -> filter[1] -> ... -> filter[9] -> analyser -> destination
            source.connect(filters[0]);
            for (let i = 0; i < filters.length - 1; i++) {
                filters[i].connect(filters[i + 1]);
            }
            filters[filters.length - 1].connect(analyser);
            analyser.connect(audioContext.destination);

            analyser.fftSize = 256;
            analyserRef.current = analyser;
            eqFiltersRef.current = filters;
            (window as any)._audioAnalyser = analyser;
        } catch (e) {
            console.error("AudioContext error:", e);
        }
    }, []);

    // Sync EQ gains with filter nodes
    useEffect(() => {
        if (eqFiltersRef.current.length > 0) {
            eqFiltersRef.current.forEach((filter, index) => {
                filter.gain.value = enabled ? (gains[index] || 0) : 0;
            });
        }
    }, [gains, enabled]);

    useEffect(() => {
        if ((window as any).Spotify) {
            setIsSpotifyReady(true);
            return;
        }

        const script = document.createElement("script");
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;
        document.body.appendChild(script);

        (window as any).onSpotifyWebPlaybackSDKReady = () => {
            setIsSpotifyReady(true);
        };
    }, []);

    useEffect(() => {
        if (!isSpotifyReady || !currentTrack || currentTrack.source !== 'spotify' || spotifyPlayerRef.current) return;

        const initSpotify = async () => {
            const row = await window.ipcRenderer.invoke('settings:get', 'spotify_access_token') as { value: string } | undefined;
            const token = row?.value;
            if (!token) return;

            const player = new (window as any).Spotify.Player({
                name: 'AT Music Pro',
                getOAuthToken: (cb: any) => { cb(token); },
                volume: volume
            });

            player.addListener('ready', ({ device_id }: { device_id: string }) => {
                console.log('Ready with Device ID', device_id);
            });

            player.connect();
            spotifyPlayerRef.current = player;
        };

        initSpotify();
    }, [isSpotifyReady, currentTrack]);

    useEffect(() => {
        if (audioRef.current) {
            if (isPlaying && streamUrl) {
                // Resume AudioContext if suspended (common browser behavior)
                if (analyserRef.current?.context.state === 'suspended') {
                    (analyserRef.current.context as AudioContext).resume();
                }
                audioRef.current.play().catch(err => {
                    console.error("Playback failed:", err);
                    pause();
                });
            } else {
                audioRef.current.pause();
            }
        }
    }, [isPlaying, streamUrl]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    useEffect(() => {
        if (audioRef.current && lastSeekTime > 0) {
            audioRef.current.currentTime = currentTime;
        }
    }, [lastSeekTime]);

    useEffect(() => {
        const updatePositionState = () => {
            if ('mediaSession' in navigator && audioRef.current && !isNaN(audioRef.current.duration)) {
                try {
                    navigator.mediaSession.setPositionState({
                        duration: audioRef.current.duration,
                        playbackRate: audioRef.current.playbackRate,
                        position: audioRef.current.currentTime
                    });
                } catch (err) { /* ignore */ }
            }
        };

        updatePositionState();

        if (isPlaying) {
            const interval = setInterval(updatePositionState, 5000);
            return () => clearInterval(interval);
        }
    }, [isPlaying, lastSeekTime]);

    return (
        <audio
            ref={audioRef}
            src={streamUrl}
            crossOrigin="anonymous"
            onEnded={next}
            onTimeUpdate={() => {
                if (audioRef.current) {
                    usePlayerStore.getState().setCurrentTime(audioRef.current.currentTime);
                }
            }}
            onLoadedMetadata={() => {
                if (audioRef.current) {
                    usePlayerStore.getState().setDuration(audioRef.current.duration);
                }
            }}
        />
    );
};

export default Player;
