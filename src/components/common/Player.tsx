import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';


const Player = () => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const {
        currentTrack,
        isPlaying,
        volume,
        pause,
        next,
        lastSeekTime,
        currentTime
    } = usePlayerStore();
    const [streamUrl, setStreamUrl] = useState<string>('');
    const analyserRef = useRef<AnalyserNode | null>(null);
    const spotifyPlayerRef = useRef<any>(null);
    const [isSpotifyReady, setIsSpotifyReady] = useState(false);

    useEffect(() => {
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
                    // Determine if it's already an atmusic protocol string
                    let encodedPath;
                    if (currentTrack.path.startsWith('atmusic://')) {
                        encodedPath = currentTrack.path;
                    } else {
                        encodedPath = `atmusic://${currentTrack.path.split('/').map(segment => encodeURIComponent(segment)).join('/')}`;
                    }
                    setStreamUrl(encodedPath);
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
        }
    }, [currentTrack]);

    useEffect(() => {
        if (!audioRef.current || analyserRef.current) return;

        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaElementSource(audioRef.current);

            source.connect(analyser);
            analyser.connect(audioContext.destination);

            analyser.fftSize = 256;
            analyserRef.current = analyser;
            (window as any)._audioAnalyser = analyser;
        } catch (e) {
            console.error("AudioContext error:", e);
        }
    }, []);

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
                name: 'AT Music Player',
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
