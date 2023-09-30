import {toUint8Array} from "js-base64";
import {useEffect, useState} from "react";
import {useCurrentTrack} from "../../../hooks/data/useCurrentTrack.ts";
import {useColourModeValue} from "../../../hooks/useColourModeValue.ts";
import {colour} from "../../../theme/colour.ts";
import {Vector2} from "../../../utils/Vector2.ts";
import {trpc} from "../../../utils/trpc.ts";
import {canvasClass, containerClass} from "./styles.css.ts";

// Waveform Bin Binary Format:
// Version - u16le (ignored)
// Bin count - u16le
// Channel count - u8
// Bins: [channel count * u16le] * bin count

const binValueMax = 2 ** 16 - 1;

function readWaveformBins(waveformBinsRaw: string) {
    const buffer = toUint8Array(waveformBinsRaw);
    const view = new DataView(buffer.buffer);

    const binCount = view.getUint16(2, true);
    const channelCount = view.getUint8(4);

    const bins = new Array<number[]>(binCount);

    for (let i = 0; i < binCount; i++) {
        const bin = new Array<number>(channelCount);

        for (let j = 0; j < channelCount; j++) {
            bin[j] =
                view.getUint16(5 + i * channelCount + j * 2, true) /
                binValueMax;
        }

        bins[i] = bin;
    }

    return bins;
}

function getWaveformVerticalOffset(
    channel: WaveformBarData["channel"],
    barHeight: number,
    canvasHeight: number
) {
    switch (channel) {
        case "mono":
        case "left":
            return ((1 - barHeight) * canvasHeight) / 2;
        case "right":
            return canvasHeight / 2;
    }
}

const WAVEFORM_BAR_WIDTH = 3;
const WAVEFORM_BAR_GAP = 1;

interface WaveformBarData {
    channel: "mono" | "left" | "right";

    canvasSize: Vector2;
    waveformColour: string;
    aheadWaveformColour: string;

    x: number;
    height: number;
    progress: number;
}

function renderWaveformBar(
    ctx: CanvasRenderingContext2D,
    data: WaveformBarData
) {
    const heightScaled = Math.max(0, data.height * 0.95 + 0.05);

    const x = Math.round(data.x);

    const y = Math.round(
        getWaveformVerticalOffset(data.channel, heightScaled, data.canvasSize.y)
    );

    const height = Math.round(
        data.channel === "mono"
            ? heightScaled * data.canvasSize.y
            : (heightScaled * data.canvasSize.y) / 2
    );

    if (data.progress < 1) {
        ctx.fillStyle = data.aheadWaveformColour;
        ctx.fillRect(x, y, WAVEFORM_BAR_WIDTH, height);
    }

    if (data.progress > 0) {
        ctx.fillStyle = data.waveformColour;
        ctx.fillRect(
            x,
            y,
            Math.round(WAVEFORM_BAR_WIDTH * data.progress),
            height
        );
    }
}

interface RendererData {
    waveformData: number[][];
    canvas: HTMLCanvasElement;
    waveformColour: string;
    aheadWaveformColour: string;
}

interface RendererWaveformCache {
    waveformData: number[][];
    canvasWidth: number;
}

function createWaveformRenderer(data: RendererData) {
    const ctx = data.canvas.getContext("2d")!;

    let cache: RendererWaveformCache | null = null;
    let cacheUpdateCallback: number | null = null;

    function handleResize() {
        data.canvas.width = data.canvas.clientWidth * devicePixelRatio;
        data.canvas.height = data.canvas.clientHeight * devicePixelRatio;

        render();

        if (cacheUpdateCallback) return;
        if (cache && cache.canvasWidth === data.canvas.width) return;

        queueCacheUpdate();
    }

    function queueCacheUpdate() {
        cacheUpdateCallback = requestIdleCallback(
            () => {
                cacheUpdateCallback = null;
                updateCache();
            },
            {
                timeout: 200
            }
        );
    }

    function updateCache() {
        const canvasWidth = data.canvas.width;
        const requiredBinCount = Math.floor(
            canvasWidth / (WAVEFORM_BAR_WIDTH + WAVEFORM_BAR_GAP)
        );

        interface Bin {
            channelValues: number[];
            sampleCount: number;
        }

        const bins = new Array<Bin>(requiredBinCount);
        const samplesPerBin = data.waveformData.length / requiredBinCount;
        const channelCount = data.waveformData[0].length;

        for (
            let sampleIndex = 0;
            sampleIndex < data.waveformData.length;
            sampleIndex++
        ) {
            const binIndex = Math.min(
                Math.floor(sampleIndex / samplesPerBin),
                requiredBinCount - 1
            );

            if (!bins[binIndex]) {
                bins[binIndex] = {
                    channelValues: new Array<number>(channelCount).fill(0),
                    sampleCount: 0
                };
            }

            const bin = bins[binIndex];
            bin.sampleCount++;

            for (
                let channelIndex = 0;
                channelIndex < channelCount;
                channelIndex++
            ) {
                bin.channelValues[channelIndex] +=
                    data.waveformData[sampleIndex][channelIndex] ** 2;
            }
        }

        const binRmsValues = bins.map(bin =>
            bin.channelValues.map(channelSquaredSum =>
                Math.sqrt(channelSquaredSum / bin.sampleCount)
            )
        );

        const channelMinMaxValues = Array.from(
            {length: channelCount},
            (_, channelId) => {
                let min = Infinity;
                let max = 0;

                for (const bin of binRmsValues) {
                    const value = bin[channelId];
                    min = Math.min(min, value);
                    max = Math.max(max, value);
                }

                return {min, max};
            }
        );

        const scaledBinRmsValues = binRmsValues.map(channels => {
            return channels.map((channelValue, channelId) => {
                const {min, max} = channelMinMaxValues[channelId];
                return (channelValue - min) / (max - min);
            });
        });

        cache = {
            waveformData: scaledBinRmsValues,
            canvasWidth
        };

        render();
    }

    let completedProgress = 0;

    function calculateProgress(barIndex: number, barCount: number) {
        const currentBar = Math.floor(completedProgress * barCount);

        if (barIndex < currentBar) {
            return 1;
        } else if (barIndex > currentBar) {
            return 0;
        } else {
            return completedProgress * barCount - currentBar;
        }
    }

    let canRender = true;
    function render() {
        if (!cache || !canRender) return;

        const canvasSize = new Vector2(data.canvas.width, data.canvas.height);

        ctx.clearRect(0, 0, canvasSize.x, canvasSize.y);

        const barCount = cache.waveformData.length;
        const barWidth = WAVEFORM_BAR_WIDTH + WAVEFORM_BAR_GAP;

        for (let i = 0; i < barCount; i++) {
            const channels = cache.waveformData[i];
            const x = i * barWidth;

            const progress = calculateProgress(i, barCount);

            if (channels.length === 0) {
                renderWaveformBar(ctx, {
                    channel: "mono",
                    canvasSize,
                    aheadWaveformColour: data.aheadWaveformColour,
                    waveformColour: data.waveformColour,
                    progress,
                    height: channels[0],
                    x
                });
            } else {
                renderWaveformBar(ctx, {
                    channel: "left",
                    canvasSize,
                    aheadWaveformColour: data.aheadWaveformColour,
                    waveformColour: data.waveformColour,
                    progress,
                    height: channels[0],
                    x
                });

                renderWaveformBar(ctx, {
                    channel: "right",
                    canvasSize,
                    aheadWaveformColour: data.aheadWaveformColour,
                    waveformColour: data.waveformColour,
                    progress,
                    height: channels[1],
                    x
                });
            }
        }
    }

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(data.canvas);

    handleResize();

    return {
        setProgress(progress: number) {
            console.log(progress);
            completedProgress = progress;
            render();
        },
        cancel() {
            canRender = false;

            resizeObserver.disconnect();

            if (cacheUpdateCallback !== null) {
                cancelIdleCallback(cacheUpdateCallback);
            }
        }
    };
}

export function WaveformSeekBar() {
    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);

    const currentTrack = useCurrentTrack();

    const {data: waveformBinsRaw} = trpc.tracks.getWaveformOverview.useQuery(
        {
            trackId: currentTrack as number
        },
        {
            enabled: Boolean(currentTrack)
        }
    );

    const waveformBarColour = useColourModeValue(
        colour("blue", 30),
        colour("blue", 20)
    );

    const aheadWaveformBarColour = useColourModeValue(
        colour("blue", 30, 0.3),
        colour("blue", 10)
    );

    const [seekProgressSetter, setSeekProgressSetter] = useState<
        ((progress: number) => void) | null
    >(null);

    useEffect(() => {
        if (!canvas || !waveformBinsRaw) return;

        const controls = createWaveformRenderer({
            canvas,
            waveformColour: waveformBarColour,
            aheadWaveformColour: aheadWaveformBarColour,
            waveformData: readWaveformBins(waveformBinsRaw)
        });

        setSeekProgressSetter(() => controls.setProgress);

        return controls.cancel;
    }, [aheadWaveformBarColour, canvas, waveformBarColour, waveformBinsRaw]);

    trpc.playback.getCurrentSeekPosition.useSubscription(undefined, {
        onData(seekPosition) {
            if (!seekProgressSetter) return;
            seekProgressSetter(seekPosition);
        }
    });

    return (
        <div className={containerClass}>
            <canvas ref={setCanvas} className={canvasClass} />
        </div>
    );
}
