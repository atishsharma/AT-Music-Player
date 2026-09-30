import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { useEqualizerStore, EQ_BANDS } from '../../store/equalizerStore';
import { toAtmusicUrl } from '../../utils/path';
import { mediaArtwork } from '../../utils/artPalette';

// Subscribes only to the fields it renders/acts on. The old `usePlayerStore()` call
// re-rendered this component on every `timeupdate` (~4x per second).
const Player = () => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const currentTrack = usePlayerStore(s => s.currentTrack);
    const isPlaying = usePlayerStore(s => s.isPlaying);
    const volume = usePlayerStore(s => s.volume);
    const lastSeekTime = usePlayerStore(s => s.lastSeekTime);
    const gains = useEqualizerStore(s => s.gains);
    const enabled = useEqualizerStore(s => s.enabled);
    const [streamUrl, setStreamUrl] = useState<string>('');
    const analyserRef = useRef<AnalyserNode | null>(null);
    const eqFiltersRef = useRef<BiquadFilterNode[]>([]);
    const spotifyPlayerRef = useRef<any>(null);
    const [isSpotifyReady, setIsSpotifyReady] = useState(false);

    // Media session action handlers only need registering once; they read live state.
    useEffect(() => {
        if (!('mediaSession' in navigator)) return;
        const store = usePlayerStore.getState;
        const seekTo = (time: number) => {
            if (audioRef.current) audioRef.current.currentTime = time;
            store().seek(time);
        };
        navigator.mediaSession.setActionHandler('play', () => store().play());
        navigator.mediaSession.setActionHandler('pause', () => store().pause());
        navigator.mediaSession.setActionHandler('previoustrack', () => store().prev());
        navigator.mediaSession.setActionHandler('nexttrack', () => store().next());
        navigator.mediaSession.setActionHandler('seekto', (details) => seekTo(details.seekTime || 0));
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
            seekTo(Math.max((audioRef.current?.currentTime || 0) - (details.seekOffset || 10), 0));
        });
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
            const audio = audioRef.current;
            seekTo(Math.min((audio?.currentTime || 0) + (details.seekOffset || 10), audio?.duration || 0));
        });
    }, []);

    useEffect(() => {
        // Note: the EQ used to be reset here on every song change, silently wiping the
        // user's equalizer settings. It now persists across tracks.
        let cancelled = false;

        if (!currentTrack) {
            setStreamUrl('');
            return;
        }

        const resolveStream = async (): Promise<string | null> => {
            if (currentTrack.path) {
                return currentTrack.path.startsWith('http://') || currentTrack.path.startsWith('https://')
                    ? currentTrack.path
                    : toAtmusicUrl(currentTrack.path);
            }
            if ((currentTrack.source === 'youtube' || currentTrack.source === 'ytmusic') && currentTrack.id) {
                // Stop the previous song right away while the new stream resolves
                audioRef.current?.pause();
                const data = await window.ipcRenderer.invoke('youtube:stream', currentTrack.id);
                return data?.url ? toAtmusicUrl(data.url) : null;
            }
            return null;
        };

        resolveStream()
            .then((url) => {
                // Ignore results for a track the user already skipped past (rapid next/prev
                // previously let a slow, stale stream overwrite the current one)
                if (cancelled) return;
                if (url) setStreamUrl(url);
                else {
                    console.error('Failed to get stream URL');
                    usePlayerStore.getState().pause();
                }
            })
            .catch((err) => {
                if (cancelled) return;
                console.error('Error fetching stream:', err);
                usePlayerStore.getState().pause();
            });

        window.ipcRenderer.invoke('library:markPlayed', currentTrack).catch(console.error);

        if ('mediaSession' in navigator) {
            const meta = {
                title: currentTrack.title || 'Unknown Title',
                artist: currentTrack.artist || 'Unknown Artist',
                album: currentTrack.album || '',
            };
            // Text first so the OS updates immediately, then again once the artwork is encoded
            navigator.mediaSession.metadata = new MediaMetadata({ ...meta, artwork: [] });
            document.title = `${meta.title} · ${meta.artist}`;
            mediaArtwork(toAtmusicUrl(currentTrack.image_path || currentTrack.thumbnail || '')).then((artwork) => {
                if (!cancelled && artwork.length) navigator.mediaSession.metadata = new MediaMetadata({ ...meta, artwork });
            });
        }

        return () => { cancelled = true; };
    }, [currentTrack]);

    useEffect(() => {
        if (!audioRef.current || analyserRef.current) return;

        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ latencyHint: 'playback' });
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

    // Sync EQ gains with filter nodes (smoothed to avoid zipper noise/clicks)
    useEffect(() => {
        eqFiltersRef.current.forEach((filter, index) => {
            const target = enabled ? (gains[index] || 0) : 0;
            filter.gain.setTargetAtTime(target, filter.context.currentTime, 0.02);
        });
    }, [gains, enabled]);

    // Spotify SDK is loaded lazily, only once a Spotify track is actually played
    // (it used to download a remote script on every app start).
    const isSpotifyTrack = currentTrack?.source === 'spotify';
    useEffect(() => {
        if (!isSpotifyTrack || isSpotifyReady) return;
        if ((window as any).Spotify) {
            setIsSpotifyReady(true);
            return;
        }

        (window as any).onSpotifyWebPlaybackSDKReady = () => setIsSpotifyReady(true);
        const script = document.createElement("script");
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;
        document.body.appendChild(script);
    }, [isSpotifyTrack, isSpotifyReady]);

    useEffect(() => {
        if (!isSpotifyReady || !isSpotifyTrack || spotifyPlayerRef.current) return;

        const initSpotify = async () => {
            // settings:get returns the raw string value (not a `{ value }` row), so the token
            // was always undefined and Spotify playback never initialised.
            const token = await window.ipcRenderer.invoke('settings:get', 'spotify_access_token') as string | null;
            if (!token) return;

            const player = new (window as any).Spotify.Player({
                name: 'AT Music Pro',
                getOAuthToken: (cb: (token: string) => void) => { cb(token); },
                volume: usePlayerStore.getState().volume
            });

            player.addListener('ready', ({ device_id }: { device_id: string }) => {
                console.log('Ready with Device ID', device_id);
            });

            player.connect();
            spotifyPlayerRef.current = player;
        };

        initSpotify();
    }, [isSpotifyReady, isSpotifyTrack]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (isPlaying && streamUrl) {
            // Resume AudioContext if suspended (common browser behavior)
            if (analyserRef.current?.context.state === 'suspended') {
                (analyserRef.current.context as AudioContext).resume();
            }
            audio.play().catch(err => {
                // AbortError = src changed mid-load (fast skipping); not a real failure
                if (err?.name === 'AbortError') return;
                console.error("Playback failed:", err);
                usePlayerStore.getState().pause();
            });
        } else {
            audio.pause();
        }
    }, [isPlaying, streamUrl]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    // Lets the OS media controls show the right play/pause state
    useEffect(() => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = currentTrack ? (isPlaying ? 'playing' : 'paused') : 'none';
        }
        if (!currentTrack) document.title = 'AT Music Pro';
    }, [isPlaying, currentTrack]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || lastSeekTime <= 0) return;
        const { currentTime, isPlaying: shouldPlay } = usePlayerStore.getState();
        audio.currentTime = currentTime;
        // Restarting an ended track (repeat / replay single track) needs an explicit play()
        if (shouldPlay && audio.paused && audio.currentSrc) {
            audio.play().catch(() => { /* handled by play effect */ });
        }
    }, [lastSeekTime]);

    useEffect(() => {
        const updatePositionState = () => {
            const audio = audioRef.current;
            if ('mediaSession' in navigator && audio && Number.isFinite(audio.duration)) {
                try {
                    navigator.mediaSession.setPositionState({
                        duration: audio.duration,
                        playbackRate: audio.playbackRate,
                        position: Math.min(audio.currentTime, audio.duration)
                    });
                } catch { /* ignore */ }
            }
        };

        updatePositionState();

        if (isPlaying) {
            const interval = setInterval(updatePositionState, 5000);
            return () => clearInterval(interval);
        }
    }, [isPlaying, lastSeekTime]);

    const handleEnded = () => {
        const state = usePlayerStore.getState();
        // Repeat-one used to be ignored: onEnded always advanced to the next track
        if (state.loop === 'one' && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(console.error);
            return;
        }
        state.next(true);
    };

    return (
        <audio
            ref={audioRef}
            src={streamUrl || undefined}
            crossOrigin="anonymous"
            preload="auto"
            onEnded={handleEnded}
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
