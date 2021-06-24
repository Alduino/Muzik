import {chakra} from "@chakra-ui/react";
import {Mutex} from "async-mutex";
import React, {
    createContext,
    FC,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";
import setPlayState from "../../../lib/rpc/set-play-state/app";
import defaultAlbumArt from "../../assets/default-album-art.svg";
import silenceAudioFile from "../../assets/silence.mp3";
import {
    beginQueue,
    cancelPlaying,
    getAndRemoveNextSong,
    setCurrentTimeFromAudio,
    setPaused,
    setResumed,
    skipToNext,
    skipToPrevious
} from "../../reducers/queue";
import {useNames, useTrack} from "../../rpc";
import {useAppDispatch, useAppSelector} from "../../store-hooks";
import {mediaSessionHandler} from "../../utils/media-session";

// Wraps the AudioPlayerImplementation with exclusive access
class AudioPlayer {
    private readonly impl: AudioPlayerImplementation;
    private readonly mutex = new Mutex();

    constructor(
        ctx: AudioContext,
        connect: (buffer: AudioBufferSourceNode) => void
    ) {
        this.impl = new AudioPlayerImplementation(ctx, connect);
    }

    get ended() {
        return this.impl.ended;
    }

    get continueAutomatically() {
        return this.impl.continueAutomatically;
    }

    set continueAutomatically(v) {
        this.impl.continueAutomatically = v;
    }

    get playAutomatically() {
        return this.impl.playAutomatically;
    }

    set playAutomatically(v) {
        this.impl.playAutomatically = v;
    }

    loadBuffers(front: string | null, back: string | null) {
        return this.mutex.runExclusive(() =>
            this.impl.loadBuffers(front, back)
        );
    }

    /**
     * Swaps the front buffer to be the back buffer, and the back buffer to be
     * the front buffer.
     */
    swapBuffers() {
        return this.mutex.runExclusive(() => this.impl.swapBuffers());
    }

    /**
     * Starts playing the front buffer
     */
    play() {
        return this.mutex.runExclusive(() => this.impl.play());
    }

    /**
     * Pauses the audio
     */
    pause() {
        return this.mutex.runExclusive(() => this.impl.pause());
    }

    /**
     * Stops the audio
     */
    stop() {
        return this.mutex.runExclusive(() => this.impl.stop());
    }

    /**
     * Seeks to the specified time in seconds
     */
    seek(time: number) {
        return this.mutex.runExclusive(() => this.impl.seek(time));
    }

    getTime() {
        return this.impl.getTime();
    }

    hasFrontBuffer() {
        return this.impl.hasFrontBuffer();
    }
}

class AudioPlayerImplementation {
    constructor(
        private readonly ctx: AudioContext,
        private readonly connect: (buffer: AudioBufferSourceNode) => void
    ) {}

    private stopEventHandlerWait = new Set<() => void>();

    private async pauseAudio(seekTo: number) {
        this.currentTime = seekTo;
        this.isPlaying = false;

        let completionFunction: () => void;
        const waitPromise = new Promise<void>(yay => {
            completionFunction = yay;
        });

        this.stopEventHandlerWait.add(completionFunction);

        this.source.stop();

        await waitPromise;

        this.stopEventHandlerWait.delete(completionFunction);
    }

    private async handleSourceEnded() {
        if (!this.isPlaying) {
            this.stopEventHandlerWait.forEach(item => item());
            return;
        }

        const continueAutomatically = this.continueAutomatically;

        this.isPlaying = false;

        this.stopEventHandlerWait.forEach(item => item());

        if (continueAutomatically) {
            await this.swapBuffers();
            this.play();
        }

        this.ended.forEach(v => v());
    }

    private createNode() {
        const buffer = this.frontBuffer;
        const source = this.ctx.createBufferSource();
        source.onended = () => this.handleSourceEnded();
        source.buffer = buffer;
        this.connect(source);
        return source;
    }

    private isPlaying = false;
    private currentTime = 0;
    private source: AudioBufferSourceNode;
    private frontBuffer: AudioBuffer;
    private backBuffer: AudioBuffer;
    private frontUrl: string;
    private backUrl: string;
    private playTime: number;

    readonly ended = new Set<() => void>();

    continueAutomatically = false;
    playAutomatically = false;

    private async loadBuffer(url: string) {
        const response = await fetch(url);
        const arrayBuff = await response.arrayBuffer();
        return await this.ctx.decodeAudioData(arrayBuff);
    }

    async loadBuffers(front: string | null, back: string | null) {
        const frontPromise =
            front && front !== this.frontUrl ? this.loadBuffer(front) : null;
        const backPromise =
            back && back !== this.backUrl ? this.loadBuffer(back) : null;

        if (frontPromise) {
            this.frontBuffer = await frontPromise;
            this.frontUrl = front;
            if (this.playAutomatically) this.play();
        } else if (!front) {
            this.frontBuffer = null;
            this.frontUrl = null;
        }

        if (backPromise) {
            this.backBuffer = await backPromise;
            this.backUrl = back;
        } else if (!back) {
            this.backBuffer = null;
            this.backUrl = null;
        }
    }

    /**
     * Swaps the front buffer to be the back buffer, and the back buffer to be
     * the front buffer.
     */
    async swapBuffers() {
        await this.stop();

        [this.frontBuffer, this.backBuffer] = [
            this.backBuffer,
            this.frontBuffer
        ];

        [this.frontUrl, this.backUrl] = [this.backUrl, this.frontUrl];

        this.currentTime = 0;
    }

    /**
     * Starts playing the front buffer
     */
    play() {
        if (this.isPlaying) return;
        if (!this.frontBuffer) return;
        this.isPlaying = true;
        this.source = this.createNode();
        this.source.start(0, this.currentTime);
        this.playTime = performance.now() / 1000 - this.currentTime;
    }

    /**
     * Pauses the audio
     */
    pause() {
        if (!this.isPlaying) return;
        return this.pauseAudio(this.getTime());
    }

    /**
     * Stops the audio
     */
    stop() {
        if (!this.isPlaying) return;
        return this.pauseAudio(0);
    }

    /**
     * Seeks to the specified time in seconds
     */
    async seek(time: number) {
        if (this.frontBuffer) {
            time = Math.max(0, Math.min(time, this.frontBuffer.duration));
        }

        if (this.isPlaying) {
            await this.stop();
            this.currentTime = time;
            this.play();
        } else {
            this.currentTime = time;
        }
    }

    getTime() {
        if (this.isPlaying) {
            return performance.now() / 1000 - this.playTime;
        } else {
            return this.currentTime;
        }
    }

    hasFrontBuffer() {
        return !!this.frontBuffer;
    }
}

interface ControllerContextValue {
    audioCtx: AudioContext;
    analyser: AnalyserNode;
    player: AudioPlayer;
}

const ControllerContext = createContext<ControllerContextValue | null>(null);

export const AudioControllerProvider: FC = ({children}) => {
    const volume = useAppSelector(state => state.media.volume);

    const audioCtx = useMemo(() => new AudioContext(), []);

    const analyser = useMemo(() => {
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;

        return analyser;
    }, []);

    const gainNode = useMemo(() => {
        const node = audioCtx.createGain();
        node.connect(audioCtx.destination);
        return node;
    }, [audioCtx]);

    const connectBufferSource = useCallback(
        bs => {
            bs.connect(analyser);
            bs.connect(gainNode);
        },
        [analyser]
    );

    const player = useMemo(
        () => new AudioPlayer(audioCtx, connectBufferSource),
        [audioCtx]
    );

    const controllerCtx = useMemo(
        () => ({
            audioCtx,
            analyser,
            player
        }),
        [audioCtx, analyser]
    );

    useEffect(() => {
        // gives the value a sharp curve
        gainNode.gain.value = (Math.pow(10, volume) - 1) / 9;
    }, [volume]);

    return (
        <ControllerContext.Provider value={controllerCtx}>
            {children}
        </ControllerContext.Provider>
    );
};

export const AudioController: FC = () => {
    const {player} = useContext(ControllerContext);

    const dispatch = useAppDispatch();

    const {
        nowPlaying: currentSongId,
        playNextSongs,
        previousSongs,
        songs,
        shuffled,
        repeatMode
    } = useAppSelector(v => v.queue);

    const nextSongId = useMemo(() => {
        return getAndRemoveNextSong({
            playNextSongs: playNextSongs.slice(),
            previousSongs: previousSongs.slice(),
            songs: songs.slice(),
            shuffled,
            repeatMode,
            currentTime: 0,
            _currentTimeWasFromAudio: false,
            rngIncrement: false
        });
    }, [playNextSongs, previousSongs, songs, shuffled, repeatMode]);

    const [currentTime, isCurrentTimeFromAudio] = useAppSelector(v => [
        v.queue.currentTime,
        v.queue._currentTimeWasFromAudio
    ]);

    const isPlaying = useAppSelector(v => v.queue.isPlaying);

    const handleComplete = useCallback(() => {
        // play the next song
        dispatch(beginQueue());
    }, [dispatch]);

    useEffect(() => {
        const currentSongUrl = currentSongId && `audio://${currentSongId}`;
        const nextSongUrl = nextSongId && `audio://${nextSongId}`;

        player.continueAutomatically = !!nextSongId;
        player.loadBuffers(currentSongUrl, nextSongUrl);
    }, [player, currentSongId, nextSongId]);

    useEffect(() => {
        player.playAutomatically = isPlaying;

        if (isPlaying) player.play();
        else player.pause();
    }, [player, isPlaying]);

    useEffect(() => {
        if (isCurrentTimeFromAudio) return;
        player.seek(currentTime);
    }, [currentTime, isCurrentTimeFromAudio]);

    useEffect(() => {
        player.ended.add(handleComplete);
        return () => {
            player.ended.delete(handleComplete);
        };
    }, [handleComplete]);

    useEffect(() => {
        const interval = setInterval(() => {
            const time = player.getTime();
            if (!isPlaying || time == null) return;
            dispatch(setCurrentTimeFromAudio(time));
        }, 100);

        return () => clearInterval(interval);
    }, [player, dispatch, isPlaying]);

    return null;
};

export const MediaSessionController: FC = () => {
    const playingTrackId = useAppSelector(state => state.queue.nowPlaying);
    const isPlaying = useAppSelector(state => state.queue.isPlaying);
    const currentTime = useAppSelector(state => state.queue.currentTime);

    const dispatch = useAppDispatch();

    const lastStateSendCurrentTime = useRef(-100);

    const {data: track} = useTrack(playingTrackId);
    const {data: names} = useNames(playingTrackId);

    const silentAudio = useMemo(() => new Audio(silenceAudioFile), []);

    useEffect(() => {
        if (!track || !names) {
            navigator.mediaSession.metadata = null;
            return;
        }

        const artUri = track.art?.url || defaultAlbumArt;
        const artMime = track.art?.mime || "image/svg";

        navigator.mediaSession.metadata = new MediaMetadata({
            title: names.track,
            album: names.album,
            artist: names.artist,
            artwork: [
                {
                    src: artUri,
                    type: artMime
                }
            ]
        });
    }, [track, names]);

    useEffect(() => {
        if (playingTrackId === null) {
            navigator.mediaSession.playbackState = "none";
        } else if (isPlaying) {
            navigator.mediaSession.playbackState = "playing";
        } else {
            navigator.mediaSession.playbackState = "paused";
        }
    }, [playingTrackId, isPlaying]);

    useEffect(() => {
        if (playingTrackId === null) {
            setPlayState({
                trackId: false
            });
        } else if (isPlaying) {
            // only update every 2 seconds
            if (Math.abs(currentTime - lastStateSendCurrentTime.current) < 2)
                return;
            lastStateSendCurrentTime.current = currentTime;

            setPlayState({
                trackId: playingTrackId,
                state: "Playing",
                startedAt: Math.floor(Date.now() / 1000 - currentTime)
            });
        } else {
            setPlayState({
                trackId: playingTrackId,
                state: "Paused"
            });
        }
    }, [playingTrackId, isPlaying, currentTime, lastStateSendCurrentTime]);

    useEffect(() => {
        function handleEnded() {
            silentAudio.play();
        }

        silentAudio.addEventListener("ended", handleEnded);
        return () => silentAudio.removeEventListener("ended", handleEnded);
    }, [silentAudio]);

    useEffect(() => {
        if (isPlaying) silentAudio.play();
        else silentAudio.pause();
    }, [silentAudio, isPlaying]);

    useEffect(() => {
        function handler() {
            if (playingTrackId === null) dispatch(beginQueue());
            else dispatch(setResumed());
        }

        mediaSessionHandler.on("play", handler);
        return () => {
            mediaSessionHandler.off("play", handler);
        };
    }, [playingTrackId]);

    useEffect(() => {
        function handler() {
            dispatch(setPaused());
        }

        mediaSessionHandler.on("pause", handler);
        return () => {
            mediaSessionHandler.off("pause", handler);
        };
    }, []);

    useEffect(() => {
        function handler() {
            dispatch(cancelPlaying());
        }

        mediaSessionHandler.on("stop", handler);
        return () => {
            mediaSessionHandler.off("stop", handler);
        };
    }, []);

    useEffect(() => {
        function handler() {
            dispatch(skipToNext());
        }

        mediaSessionHandler.on("nexttrack", handler);
        return () => {
            mediaSessionHandler.off("nexttrack", handler);
        };
    }, []);

    useEffect(() => {
        function handler() {
            dispatch(skipToPrevious());
        }

        mediaSessionHandler.on("previoustrack", handler);
        return () => {
            mediaSessionHandler.off("previoustrack", handler);
        };
    }, []);

    return null;
};

export interface VisualiserIconProps {
    bands: number;
    gap?: number;
    className?: string;
}

export const VisualiserIcon = chakra((props: VisualiserIconProps) => {
    const {audioCtx, analyser} = useContext(ControllerContext);

    const [heights, setHeights] = useState<number[]>([]);

    useEffect(() => {
        const dataBuff = new Uint8Array(analyser.frequencyBinCount);

        let drawing = true;

        function draw() {
            if (!drawing) return;
            requestAnimationFrame(draw);

            analyser.getByteFrequencyData(dataBuff);

            const outputValues = Array.from({length: props.bands}, () => 0);
            const outputCounts = Array.from({length: props.bands}, () => 0);

            for (let i = 0; i < dataBuff.length; i++) {
                const el = dataBuff[i];

                const frequency =
                    ((i / dataBuff.length) * audioCtx.sampleRate) / 2;

                // maps 0 -> 0, 350 -> 1/3, 3000 -> 2/3, 22000 -> 1
                const outIndexPercentage =
                    Math.log(frequency / 55 + 1) / Math.log(401);

                // make sure it doesn't go above max
                const outIndex = Math.floor(
                    Math.min(0.999, outIndexPercentage) * props.bands
                );

                outputValues[outIndex] += el / 255;
                outputCounts[outIndex]++;
            }

            const output = outputValues.map(
                (el, i) => el / (outputCounts[i] || 1)
            );

            setHeights(output);
        }

        requestAnimationFrame(draw);

        return () => {
            drawing = false;
        };
    }, [audioCtx, analyser, props.bands]);

    const gap = (props.gap || 0.1) * 2;

    return (
        <svg viewBox="0 0 1 1" className={props.className}>
            {heights.map((height, i) => (
                <rect
                    key={i}
                    fill="currentColor"
                    x={i / props.bands + gap / 4}
                    y={1 - height}
                    width={1 / props.bands - gap / 2}
                    height={height}
                />
            ))}
        </svg>
    );
});
VisualiserIcon.displayName = "VisualiserIcon";
