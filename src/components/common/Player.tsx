import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { useEqualizerStore } from '../../store/equalizerStore';
import { useAudioStore } from '../../store/audioStore';
import { createAudioEngine, type AudioEngine } from '../../audio/engine';
import { toAtmusicUrl } from '../../utils/path';
import { mediaArtwork } from '../../utils/artPalette';
import type { Track } from '../../types/library';

const trackKey = (t: Track) => `${t.source || 'local'}:${t.id}`;

async function resolveStream(track: Track): Promise<string | null> {
    // History rows store online songs as `yt:<id>` paths
    const ytId = track.path?.startsWith('yt:') ? track.path.slice(3) : null;
    if (track.path && !ytId) {
        return track.path.startsWith('http://') || track.path.startsWith('https://') ? track.path : toAtmusicUrl(track.path);
    }
    if (ytId || ((track.source === 'youtube' || track.source === 'ytmusic') && track.id)) {
        const data = await window.ipcRenderer.invoke('youtube:stream', ytId || track.id);
        return data?.url ? toAtmusicUrl(data.url) : null;
    }
    return null;
}

// Two <audio> decks: the active one plays the current song; the other preloads the next
// one so it can crossfade in (or start with no gap). Subscribes only to the fields it
// acts on, so time updates don't re-render this component.
const Player = () => {
    const deckA = useRef<HTMLAudioElement>(null);
    const deckB = useRef<HTMLAudioElement>(null);
    const el = (i: number) => (i === 0 ? deckA : deckB).current;
    const activeRef = useRef(0);
    const activeEl = () => el(activeRef.current);
    const engineRef = useRef<AudioEngine | null>(null);
    /** Next song, loading in the idle deck */
    const preloadRef = useRef<{ key: string; deck: number; url: string; ready: boolean } | null>(null);
    /** Set while the store advances to a song that is already playing in the other deck */
    const handoffRef = useRef<{ key: string; deck: number; url: string } | null>(null);
    const fadeTimerRef = useRef<number>();

    const currentTrack = usePlayerStore(s => s.currentTrack);
    const isPlaying = usePlayerStore(s => s.isPlaying);
    const volume = usePlayerStore(s => s.volume);
    const lastSeekTime = usePlayerStore(s => s.lastSeekTime);
    const gains = useEqualizerStore(s => s.gains);
    const enabled = useEqualizerStore(s => s.enabled);
    const normalize = useAudioStore(s => s.normalize);
    const vocalReduction = useAudioStore(s => s.vocalReduction);
    const [streamUrl, setStreamUrl] = useState<string>('');
    const spotifyPlayerRef = useRef<SpotifyPlayer | null>(null);
    const [isSpotifyReady, setIsSpotifyReady] = useState(false);

    // Media session action handlers only need registering once; they read live state.
    useEffect(() => {
        if (!('mediaSession' in navigator)) return;
        const store = usePlayerStore.getState;
        const seekTo = (time: number) => {
            const audio = activeEl();
            if (audio) audio.currentTime = time;
            store().seek(time);
        };
        navigator.mediaSession.setActionHandler('play', () => store().play());
        navigator.mediaSession.setActionHandler('pause', () => store().pause());
        navigator.mediaSession.setActionHandler('previoustrack', () => store().prev());
        navigator.mediaSession.setActionHandler('nexttrack', () => store().next());
        navigator.mediaSession.setActionHandler('seekto', (details) => seekTo(details.seekTime || 0));
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
            seekTo(Math.max((activeEl()?.currentTime || 0) - (details.seekOffset || 10), 0));
        });
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
            const audio = activeEl();
            seekTo(Math.min((audio?.currentTime || 0) + (details.seekOffset || 10), audio?.duration || 0));
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setFade = (i: number, value: number) => {
        const eng = engineRef.current;
        if (eng) eng.fadeTo(eng.decks[i as 0 | 1], value, value, 0);
    };

    useEffect(() => {
        // Note: the EQ used to be reset here on every song change, silently wiping the
        // user's equalizer settings. It now persists across tracks.
        let cancelled = false;

        if (!currentTrack) {
            setStreamUrl('');
            return;
        }

        const key = trackKey(currentTrack);
        const handoff = handoffRef.current;
        handoffRef.current = null;

        if (handoff && handoff.key === key) {
            // Already playing in the other deck (crossfade / gapless): just adopt it
            activeRef.current = handoff.deck;
            setStreamUrl(handoff.url);
            const d = el(handoff.deck);
            if (d && Number.isFinite(d.duration)) usePlayerStore.getState().setDuration(d.duration);
        } else {
            // A jump (click, skip, prev): stop any fade-out and silence the other deck
            window.clearTimeout(fadeTimerRef.current);
            fadeTimerRef.current = undefined;
            const pre = preloadRef.current;
            preloadRef.current = null;
            const reuse = pre?.ready && pre.key === key ? pre : null;
            const target = reuse ? reuse.deck : activeRef.current;
            activeRef.current = target;
            [0, 1].forEach(i => { if (i !== target) el(i)?.pause(); });
            setFade(target, 1);

            if (reuse) {
                setStreamUrl(reuse.url);
            } else {
                // Stop the previous song right away while the new stream resolves
                if (currentTrack.source === 'youtube' || currentTrack.source === 'ytmusic') el(target)?.pause();
                resolveStream(currentTrack)
                    .then((url) => {
                        // Ignore results for a track the user already skipped past (rapid next/prev
                        // previously let a slow, stale stream overwrite the current one)
                        if (cancelled) return;
                        if (url) {
                            // Same stream as the deck already holds (song picked again): restart it
                            const d = el(target);
                            if (d && d.dataset.url === url) {
                                d.currentTime = 0;
                                if (usePlayerStore.getState().isPlaying) d.play().catch(() => { /* play effect */ });
                            }
                            setStreamUrl(url);
                        } else {
                            console.error('Failed to get stream URL');
                            usePlayerStore.getState().pause();
                        }
                    })
                    .catch((err) => {
                        if (cancelled) return;
                        console.error('Error fetching stream:', err);
                        usePlayerStore.getState().pause();
                    });
            }
        }

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

    // Point the active deck at the current stream (a hand-off deck already has it)
    useEffect(() => {
        const d = activeEl();
        if (!d) return;
        if (!streamUrl) {
            d.pause();
            d.removeAttribute('src');
            delete d.dataset.url;
            return;
        }
        if (d.dataset.url !== streamUrl) {
            d.dataset.url = streamUrl;
            d.src = streamUrl;
            engineRef.current?.resetLevel(activeRef.current);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [streamUrl]);

    useEffect(() => {
        if (!deckA.current || !deckB.current || engineRef.current) return;
        try {
            const engine = createAudioEngine([deckA.current, deckB.current]);
            engineRef.current = engine;
            window._audioAnalyser = engine.analyser;
            engine.setVolume(usePlayerStore.getState().volume);
            engine.setNormalize(useAudioStore.getState().normalize);
        } catch (e) {
            console.error("AudioContext error:", e);
        }
    }, []);

    // Sync EQ gains with filter nodes (smoothed to avoid zipper noise/clicks)
    useEffect(() => {
        engineRef.current?.eq.forEach((filter, index) => {
            const target = enabled ? (gains[index] || 0) : 0;
            filter.gain.setTargetAtTime(target, filter.context.currentTime, 0.02);
        });
    }, [gains, enabled]);

    useEffect(() => { engineRef.current?.setNormalize(normalize); }, [normalize]);
    useEffect(() => { engineRef.current?.setVocalReduction(vocalReduction); }, [vocalReduction]);

    // Spotify SDK is loaded lazily, only once a Spotify track is actually played
    // (it used to download a remote script on every app start).
    const isSpotifyTrack = currentTrack?.source === 'spotify';
    useEffect(() => {
        if (!isSpotifyTrack || isSpotifyReady) return;
        if (window.Spotify) {
            setIsSpotifyReady(true);
            return;
        }

        window.onSpotifyWebPlaybackSDKReady = () => setIsSpotifyReady(true);
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
            if (!token || !window.Spotify) return;

            const player = new window.Spotify.Player({
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
        const audio = activeEl();
        if (!audio) return;
        if (isPlaying && streamUrl) {
            // Resume AudioContext if suspended (common browser behavior)
            if (engineRef.current?.ctx.state === 'suspended') engineRef.current.ctx.resume();
            audio.play().catch(err => {
                // AbortError = src changed mid-load (fast skipping); not a real failure
                if (err?.name === 'AbortError') return;
                console.error("Playback failed:", err);
                usePlayerStore.getState().pause();
            });
        } else {
            audio.pause();
            // Pausing mid-crossfade: drop the fading-out song
            if (fadeTimerRef.current) {
                window.clearTimeout(fadeTimerRef.current);
                fadeTimerRef.current = undefined;
                el(1 - activeRef.current)?.pause();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPlaying, streamUrl]);

    // Volume lives on the master gain (falls back to the elements without Web Audio)
    useEffect(() => {
        if (engineRef.current) engineRef.current.setVolume(volume);
        else [0, 1].forEach(i => { const d = el(i); if (d) d.volume = volume; });
    }, [volume]);

    // Lets the OS media controls show the right play/pause state
    useEffect(() => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = currentTrack ? (isPlaying ? 'playing' : 'paused') : 'none';
        }
        if (!currentTrack) document.title = 'AT Music Pro';
    }, [isPlaying, currentTrack]);

    useEffect(() => {
        const audio = activeEl();
        if (!audio || lastSeekTime <= 0) return;
        const { currentTime, isPlaying: shouldPlay } = usePlayerStore.getState();
        audio.currentTime = currentTime;
        // Restarting an ended track (repeat / replay single track) needs an explicit play()
        if (shouldPlay && audio.paused && audio.currentSrc) {
            audio.play().catch(() => { /* handled by play effect */ });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastSeekTime]);

    useEffect(() => {
        const updatePositionState = () => {
            const audio = activeEl();
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPlaying, lastSeekTime]);

    /** Start the preloaded next song in the idle deck and fade the current one out */
    const startHandoff = (seconds: number) => {
        const pre = preloadRef.current;
        if (!pre?.ready) return false;
        preloadRef.current = null;
        const from = activeRef.current;
        const to = pre.deck;
        const next = el(to);
        const prev = el(from);
        if (!next) return false;
        const eng = engineRef.current;
        next.currentTime = 0;
        eng?.resetLevel(to);
        if (eng) {
            eng.fadeTo(eng.decks[to as 0 | 1], seconds > 0 ? 0 : 1, 1, seconds);
            eng.fadeTo(eng.decks[from as 0 | 1], 1, 0, seconds);
        }
        next.play().catch(() => { /* the play effect retries */ });
        window.clearTimeout(fadeTimerRef.current);
        if (seconds > 0) {
            fadeTimerRef.current = window.setTimeout(() => {
                prev?.pause();
                fadeTimerRef.current = undefined;
            }, seconds * 1000 + 80);
        } else {
            prev?.pause();
        }
        activeRef.current = to;
        handoffRef.current = { key: pre.key, deck: to, url: pre.url };
        usePlayerStore.getState().next(true);
        return true;
    };

    /** The preload is still the song that plays next (the queue may have changed) */
    const preloadMatchesQueue = () => {
        const nextTrack = usePlayerStore.getState().queue[0];
        return !!nextTrack && preloadRef.current?.key === trackKey(nextTrack);
    };

    const handleTimeUpdate = (i: number) => {
        if (i !== activeRef.current) return; // the deck fading out
        const d = el(i);
        if (!d) return;
        const player = usePlayerStore.getState();
        player.setCurrentTime(d.currentTime);

        const { crossfade, gapless } = useAudioStore.getState();
        const fadeLen = engineRef.current ? crossfade : 0; // fades need Web Audio
        if (fadeLen === 0 && !gapless) return;
        const remaining = d.duration - d.currentTime;
        if (!Number.isFinite(remaining) || player.loop === 'one') return;

        // Preload the next song ~20 s before it's needed (not while the other deck is still fading out)
        const nextTrack = player.queue[0];
        if (nextTrack && remaining <= fadeLen + 20 && !fadeTimerRef.current && preloadRef.current?.key !== trackKey(nextTrack)) {
            const key = trackKey(nextTrack);
            const deck = 1 - i;
            preloadRef.current = { key, deck, url: '', ready: false };
            resolveStream(nextTrack).then((url) => {
                const other = el(deck);
                if (!url || !other || preloadRef.current?.key !== key || activeRef.current === deck) return;
                other.pause();
                other.dataset.url = url;
                other.src = url;
                other.load();
                setFade(deck, 0);
                preloadRef.current = { key, deck, url, ready: true };
            }).catch(() => { if (preloadRef.current?.key === key) preloadRef.current = null; });
        }

        if (fadeLen > 0 && remaining <= fadeLen && player.isPlaying && !handoffRef.current && preloadMatchesQueue()) {
            startHandoff(Math.max(0.5, remaining));
        }
    };

    const handleEnded = (i: number) => {
        if (i !== activeRef.current) return;
        const state = usePlayerStore.getState();
        // Repeat-one used to be ignored: onEnded always advanced to the next track
        if (state.loop === 'one') {
            const d = el(i);
            if (d) {
                d.currentTime = 0;
                d.play().catch(console.error);
            }
            return;
        }
        // Gapless: the next song is already buffered in the other deck
        if (preloadMatchesQueue() && startHandoff(0)) return;
        state.next(true);
    };

    const deck = (i: number) => (
        <audio
            key={i}
            ref={i === 0 ? deckA : deckB}
            crossOrigin="anonymous"
            preload="auto"
            onEnded={() => handleEnded(i)}
            onTimeUpdate={() => handleTimeUpdate(i)}
            onLoadedMetadata={() => {
                const d = el(i);
                if (d && i === activeRef.current) usePlayerStore.getState().setDuration(d.duration);
            }}
        />
    );

    return <>{deck(0)}{deck(1)}</>;
};

export default Player;
