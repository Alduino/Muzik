import {chakra} from "@chakra-ui/react";
import React, {
    createContext,
    FC,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState
} from "react";
import defaultAlbumArt from "../../assets/default-album-art.svg";
import {
    beginQueue,
    cancelPlaying,
    setCurrentTimeFromAudio,
    setPaused,
    setResumed,
    skipToNext,
    skipToPrevious
} from "../../reducers/queue";
import {useNames, useTrack} from "../../rpc";
import {useAppDispatch, useAppSelector} from "../../store-hooks";
import {mediaSessionHandler} from "../../utils/media-session";

interface ControllerContextValue {
    audioCtx: AudioContext;
    audio: HTMLAudioElement;
    source: MediaElementAudioSourceNode;
    analyser: AnalyserNode;
}

const ControllerContext = createContext<ControllerContextValue | null>(null);

export const AudioControllerProvider: FC = ({children}) => {
    const audioCtx = useMemo(() => new AudioContext(), []);
    const audio = useMemo(() => new Audio(), [audioCtx]);

    const source = useMemo(() => {
        return audioCtx.createMediaElementSource(audio);
    }, [audioCtx, audio]);

    const analyser = useMemo(() => {
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;

        source.connect(analyser);
        source.connect(audioCtx.destination);

        return analyser;
    }, []);

    const controllerCtx = useMemo(
        () => ({
            audioCtx,
            audio,
            source,
            analyser
        }),
        [audioCtx, audio, source, analyser]
    );

    return (
        <ControllerContext.Provider value={controllerCtx}>
            {children}
        </ControllerContext.Provider>
    );
};

export const AudioController: FC = () => {
    const {audio} = useContext(ControllerContext);

    const dispatch = useAppDispatch();

    const currentSongId = useAppSelector(v => v.queue.nowPlaying);

    const [currentTime, isCurrentTimeFromAudio] = useAppSelector(v => [
        v.queue.currentTime,
        v.queue._currentTimeWasFromAudio
    ]);

    const isPlaying = useAppSelector(v => v.queue.isPlaying);

    const handleComplete = useCallback(() => {
        // play the next song
        dispatch(setPaused());
        dispatch(beginQueue());
    }, [dispatch]);

    useEffect(() => {
        audio.src = currentSongId === null ? "" : `audio://${currentSongId}`;

        return () => {
            audio.src = "";
        };
    }, [currentSongId]);

    useEffect(() => {
        if (isCurrentTimeFromAudio) return;
        audio.currentTime = currentTime;
    }, [currentTime, isCurrentTimeFromAudio]);

    useEffect(() => {
        // called whenever isPlaying changes or currentSongId changes
        // currentSongId is needed because audio reloads when it changes
        if (isPlaying) audio.play();
        else audio.pause();
    }, [isPlaying, currentSongId]);

    useEffect(() => {
        audio.addEventListener("ended", handleComplete);
        return () => audio.removeEventListener("ended", handleComplete);
    }, [handleComplete]);

    useEffect(() => {
        const interval = setInterval(() => {
            const time = audio.currentTime;
            if (!isPlaying || time == null) return;
            dispatch(setCurrentTimeFromAudio(time));
        }, 100);

        return () => clearInterval(interval);
    }, [audio, dispatch, isPlaying]);

    return null;
};

export const MediaSessionController: FC = () => {
    const playingTrackId = useAppSelector(state => state.queue.nowPlaying);
    const isPlaying = useAppSelector(state => state.queue.isPlaying);

    const dispatch = useAppDispatch();

    const {data: track} = useTrack(playingTrackId);
    const {data: names} = useNames(playingTrackId);

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
