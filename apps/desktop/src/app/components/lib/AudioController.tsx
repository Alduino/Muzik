import React, {
    createContext,
    FC,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState
} from "react";
import {useSelector} from "react-redux";
import {RootState} from "../../reducers/root";
import {useAppDispatch} from "../../store";
import {
    beginQueue,
    setCurrentTimeFromAudio,
    setPaused,
    setResumed
} from "../../reducers/queue";

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

    const currentSongId = useSelector<RootState, number>(
        v => v.queue.nowPlaying
    );

    const [currentTime, isCurrentTimeFromAudio] = useSelector<
        RootState,
        [number, boolean]
    >(v => [v.queue.currentTime, v.queue._currentTimeWasFromAudio]);

    const isPlaying = useSelector<RootState, boolean>(v => v.queue.isPlaying);

    const handleExternalPlay = useCallback(() => {
        dispatch(setResumed());
    }, [dispatch]);

    const handleExternalPause = useCallback(() => {
        dispatch(setPaused());
    }, [dispatch]);

    const handleComplete = useCallback(() => {
        // play the next song
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
        if (isPlaying) audio.play();
        else audio.pause();
    }, [isPlaying]);

    useEffect(() => {
        audio.addEventListener("play", handleExternalPlay);
        return () => audio.removeEventListener("play", handleExternalPlay);
    }, [handleExternalPlay]);

    useEffect(() => {
        audio.addEventListener("pause", handleExternalPause);
        return () => audio.removeEventListener("pause", handleExternalPause);
    }, [handleExternalPause]);

    useEffect(() => {
        audio.addEventListener("ended", handleComplete);
        return () => audio.removeEventListener("ended", handleComplete);
    });

    useEffect(() => {
        const interval = setInterval(() => {
            const time = audio.currentTime;
            if (!isPlaying || time == null) return;
            dispatch(setCurrentTimeFromAudio(time));
        }, 500);

        return () => clearInterval(interval);
    }, [audio, dispatch, isPlaying]);

    return null;
};

export interface VisualiserIconProps {
    bands: number;
    gap?: number;
}

export const VisualiserIcon: FC<VisualiserIconProps> = props => {
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
        <svg viewBox="0 0 1 1">
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
};
