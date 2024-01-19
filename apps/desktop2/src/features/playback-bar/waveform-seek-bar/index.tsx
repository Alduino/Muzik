import {toUint8Array} from "js-base64";
import {useEffect, useMemo, useState} from "react";
import {formatDuration} from "../../../../../desktop/src/app/utils/formatDuration.tsx";
import {u16leReader, WaveformBucketCalculator} from "../../../../shared/waveform-buckets";
import {useCurrentTrack} from "../../../hooks/data/useCurrentTrack.ts";
import {useColourModeValue} from "../../../hooks/useColourModeValue.ts";
import useEventHandler from "../../../hooks/useEventHandler.ts";
import {useTranslation} from "../../../hooks/useTranslation.ts";
import {colour} from "../../../theme/colour.ts";
import {Vector2} from "../../../utils/Vector2.ts";
import {trpc} from "../../../utils/trpc.ts";
import {canvasClass, containerClass, timeIndicatorClass, timeIndicatorContainerClass} from "./styles.css.ts";

const emptyWaveformDataview = new DataView(
    new Uint8Array([
        0x00, // Version
        0x00, // ...
        0x00, // Bucket count = 0
        0x00, // ...
        0x00 // Channel count
    ]).buffer
);

function readWaveformBucketsMetadata(dataView: DataView) {
    return {
        bucketCount: dataView.getUint16(2, true),
        channelCount: dataView.getUint8(4)
    };
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

const LOADING_WAVEFORM_WIDTH = 10;
const LOADING_WAVEFORM_GAP = 0;

const WAVEFORM_BAR_WIDTH = 3;
const WAVEFORM_BAR_GAP = 1;

function rect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
) {
    ctx.fillRect(
        Math.floor(x),
        Math.floor(y),
        Math.ceil(width),
        Math.ceil(height)
    );
}

interface WaveformBarData {
    channel: "mono" | "left" | "right";

    canvasSize: Vector2;
    playedWaveformColour: string;
    mouseWaveformColour: string;
    aheadWaveformColour: string;

    x: number;
    height: number;
    mouseProgress: number;
    playbackProgress: number;

    hasMouse: boolean;

    barWidth: number;
}

function renderWaveformBar(
    ctx: CanvasRenderingContext2D,
    data: WaveformBarData
) {
    const minHeight = (data.channel === "mono" ? 10 : 5) / ctx.canvas.height;
    const maxHeight = 1 - 10 / ctx.canvas.height;

    const heightScaled = minHeight + data.height * (maxHeight - minHeight);

    const y = getWaveformVerticalOffset(
        data.channel,
        heightScaled,
        data.canvasSize.y
    );

    const height =
        data.channel === "mono"
            ? heightScaled * data.canvasSize.y
            : (heightScaled * data.canvasSize.y) / 2;

    function calculatePositions() {
        if (!data.hasMouse) {
            return {
                mouseStart: 0,
                mouseWidth: 0,

                playedStart: 0,
                playedWidth: data.playbackProgress,

                aheadStart: data.playbackProgress,
                aheadWidth: 1 - data.playbackProgress
            };
        } else if (data.mouseProgress > data.playbackProgress) {
            return {
                mouseStart: data.playbackProgress,
                mouseWidth: data.mouseProgress - data.playbackProgress,

                playedStart: 0,
                playedWidth: data.playbackProgress,

                aheadStart: data.mouseProgress,
                aheadWidth: 1 - data.mouseProgress
            };
        } else {
            return {
                mouseStart: data.mouseProgress,
                mouseWidth: data.playbackProgress - data.mouseProgress,

                playedStart: 0,
                playedWidth: data.mouseProgress,

                aheadStart: data.playbackProgress,
                aheadWidth: 1 - data.playbackProgress
            };
        }
    }

    const positions = calculatePositions();

    ctx.fillStyle = data.mouseWaveformColour;
    rect(
        ctx,
        data.x + positions.mouseStart * data.barWidth,
        y,
        positions.mouseWidth * data.barWidth,
        height
    );

    ctx.fillStyle = data.playedWaveformColour;
    rect(
        ctx,
        data.x + positions.playedStart * data.barWidth,
        y,
        positions.playedWidth * data.barWidth,
        height
    );

    ctx.fillStyle = data.aheadWaveformColour;
    rect(
        ctx,
        data.x + positions.aheadStart * data.barWidth,
        y,
        positions.aheadWidth * data.barWidth,
        height
    );
}

interface RendererData {
    canvas: HTMLCanvasElement;
    waveformColour: string;
    playbackAheadWaveformColour: string;
    cursorAheadWaveformColour: string;

    onProgressChange(progress: number): void;
}

interface RendererWaveformCache {
    waveformData: number[][];
    canvasWidth: number;
}

function createWaveformRenderer(data: RendererData) {
    const ctx = data.canvas.getContext("2d")!;

    let cache: RendererWaveformCache | null = null;
    let cacheUpdateCallback: number | null = null;

    let completedProgress = 0;
    let mouseProgress: number | null = null;
    let waveformData: DataView = emptyWaveformDataview;
    let loaded = false;

    function handleResize() {
        data.canvas.width = data.canvas.clientWidth * devicePixelRatio;
        data.canvas.height = data.canvas.clientHeight * devicePixelRatio;

        render();

        if (cacheUpdateCallback) return;
        if (cache && cache.canvasWidth === data.canvas.width) return;

        queueCacheUpdate();
    }

    function handleMouseExit() {
        mouseProgress = null;
        render();
    }

    function handleMouseDown(event: PointerEvent) {
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    }

    function handleMouseMove(event: PointerEvent) {
        mouseProgress = Math.max(
            0,
            Math.min(event.offsetX / data.canvas.width)
        );

        render();
    }

    function handleMouseUp() {
        if (!mouseProgress) return;
        data.onProgressChange(mouseProgress);
    }

    function queueCacheUpdate() {
        if (cacheUpdateCallback) {
            cancelIdleCallback(cacheUpdateCallback);
        }

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
        const barWidth = loaded ? WAVEFORM_BAR_WIDTH : LOADING_WAVEFORM_WIDTH;
        const barGap = loaded ? WAVEFORM_BAR_GAP : LOADING_WAVEFORM_GAP;

        const waveformMetadata = readWaveformBucketsMetadata(waveformData);

        const canvasWidth = data.canvas.width;
        const requiredBucketCount = Math.floor(
            canvasWidth / (barWidth + barGap)
        );

        const waveformBucketCalculator = new WaveformBucketCalculator({
            bucketCount: requiredBucketCount,
            channelCount: waveformMetadata.channelCount,
            frameCount: waveformMetadata.bucketCount,
            dataReader: u16leReader(5)
        });

        waveformBucketCalculator.update(waveformData);

        cache = {
            waveformData: waveformBucketCalculator.digest(),
            canvasWidth
        };

        render();
    }

    let canRender = true;

    function render() {
        if (!cache || !canRender) return;

        const canvasSize = new Vector2(data.canvas.width, data.canvas.height);

        ctx.clearRect(0, 0, canvasSize.x, canvasSize.y);

        const barWidth = loaded ? WAVEFORM_BAR_WIDTH : LOADING_WAVEFORM_WIDTH;
        const barGap = loaded ? WAVEFORM_BAR_GAP : LOADING_WAVEFORM_GAP;

        const barCount = cache.waveformData.length;
        const barFullWidth = barWidth + barGap;
        const barsWidth = barCount * barFullWidth;

        function calculateProgress(
            barIndex: number,
            barCount: number,
            progress: number
        ) {
            const currentBar = Math.floor(progress * barCount);

            if (barIndex < currentBar) {
                return 1;
            } else if (barIndex > currentBar) {
                return 0;
            } else {
                const rawProgress = progress * barCount - currentBar;
                return Math.min(1, (rawProgress / barWidth) * barFullWidth);
            }
        }

        for (let i = 0; i < barCount; i++) {
            const channels = cache.waveformData[i];
            const x = i * barFullWidth;

            const thisMouseProgress = calculateProgress(
                i,
                barCount,
                mouseProgress ?? 0
            );

            const thisPlaybackProgress = calculateProgress(
                i,
                barCount,
                completedProgress
            );

            if (channels.length === 1) {
                renderWaveformBar(ctx, {
                    channel: "mono",
                    canvasSize,
                    mouseWaveformColour: data.cursorAheadWaveformColour,
                    aheadWaveformColour: data.playbackAheadWaveformColour,
                    playedWaveformColour: data.waveformColour,
                    mouseProgress: thisMouseProgress,
                    playbackProgress: thisPlaybackProgress,
                    height: channels[0],
                    hasMouse: mouseProgress !== null,
                    barWidth,
                    x
                });
            } else if (channels.length >= 2) {
                renderWaveformBar(ctx, {
                    channel: "left",
                    canvasSize,
                    mouseWaveformColour: data.cursorAheadWaveformColour,
                    aheadWaveformColour: data.playbackAheadWaveformColour,
                    playedWaveformColour: data.waveformColour,
                    mouseProgress: thisMouseProgress,
                    playbackProgress: thisPlaybackProgress,
                    height: channels[0],
                    hasMouse: mouseProgress !== null,
                    barWidth,
                    x
                });

                renderWaveformBar(ctx, {
                    channel: "right",
                    canvasSize,
                    mouseWaveformColour: data.cursorAheadWaveformColour,
                    aheadWaveformColour: data.playbackAheadWaveformColour,
                    playedWaveformColour: data.waveformColour,
                    mouseProgress: thisMouseProgress,
                    playbackProgress: thisPlaybackProgress,
                    height: channels[1],
                    hasMouse: mouseProgress !== null,
                    barWidth,
                    x
                });
            }
        }

        const gradient = ctx.createLinearGradient(
            completedProgress * barsWidth - 10,
            0,
            completedProgress * barsWidth,
            0
        );

        gradient.addColorStop(0, "rgba(31,120,136,0)");
        gradient.addColorStop(1, "rgba(31,84,136,0.3)");

        ctx.fillStyle = gradient;
        ctx.fillRect(
            0,
            0,
            Math.round(completedProgress * barsWidth),
            canvasSize.y
        );

        ctx.strokeStyle = "rgb(31,84,136)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(completedProgress * barsWidth, 0);
        ctx.lineTo(completedProgress * barsWidth, canvasSize.y);
        ctx.stroke();

        if (mouseProgress !== null) {
            ctx.strokeStyle = "rgb(60,160,255)";
            ctx.beginPath();
            ctx.moveTo(Math.round(mouseProgress * barsWidth) - 0.5, 0);
            ctx.lineTo(
                Math.round(mouseProgress * barsWidth) - 0.5,
                canvasSize.y
            );
            ctx.stroke();
        }
    }

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(data.canvas);
    handleResize();

    data.canvas.addEventListener("pointerleave", handleMouseExit);
    data.canvas.addEventListener("pointermove", handleMouseMove);
    data.canvas.addEventListener("pointerup", handleMouseUp);
    data.canvas.addEventListener("pointerdown", handleMouseMove);
    data.canvas.addEventListener("pointerdown", handleMouseDown);

    return {
        setProgress(progress: number) {
            completedProgress = progress;
            render();
        },
        setWaveformData(newWaveformData: DataView) {
            waveformData = newWaveformData;
            queueCacheUpdate();
        },
        setLoaded(newState: boolean) {
            loaded = newState;
            updateCache();
        },
        cleanup() {
            canRender = false;

            resizeObserver.disconnect();

            data.canvas.removeEventListener("pointerleave", handleMouseExit);
            data.canvas.removeEventListener("pointermove", handleMouseMove);
            data.canvas.removeEventListener("pointerup", handleMouseUp);
            data.canvas.removeEventListener("pointerdown", handleMouseMove);
            data.canvas.removeEventListener("pointerdown", handleMouseDown);

            if (cacheUpdateCallback !== null) {
                cancelIdleCallback(cacheUpdateCallback);
            }
        }
    };
}

export function WaveformSeekBar() {
    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);

    const currentTrack = useCurrentTrack();

    const setProgress = trpc.playback.setCurrentSeekPosition.useMutation();

    const waveformBarColour = useColourModeValue(
        colour("blue", 30),
        colour("blue", 20)
    );

    const cursorAheadWaveformBarColour = useColourModeValue(
        colour("blue", 30, 0.7),
        colour("blue", 20, 0.8)
    );

    const playbackAheadWaveformBarColour = useColourModeValue(
        colour("blue", 30, 0.3),
        colour("blue", 10)
    );

    const handleProgressChanged = useEventHandler((progress: number) => {
        setProgress.mutate({
            seekPosition: progress
        });
    });

    const waveformRenderer = useMemo(() => {
        if (!canvas) return;

        return createWaveformRenderer({
            canvas,
            waveformColour: waveformBarColour,
            cursorAheadWaveformColour: cursorAheadWaveformBarColour,
            playbackAheadWaveformColour: playbackAheadWaveformBarColour,
            onProgressChange: handleProgressChanged
        });
    }, [
        canvas,
        waveformBarColour,
        cursorAheadWaveformBarColour,
        playbackAheadWaveformBarColour,
        handleProgressChanged
    ]);

    useEffect(() => {
        return () => {
            if (!waveformRenderer) return;
            waveformRenderer.cleanup();
        };
    }, [waveformRenderer]);

    trpc.tracks.getWaveformOverview.useSubscription(
        {
            trackId: currentTrack as number
        },
        {
            onData(data) {
                const waveformData = toUint8Array(data.data);
                const waveformDataView = new DataView(waveformData.buffer);
                waveformRenderer?.setWaveformData(waveformDataView);
                waveformRenderer?.setLoaded(data.done);
            }
        }
    );

    trpc.playback.getCurrentSeekPosition$.useSubscription(undefined, {
        onData(seekPosition) {
            waveformRenderer?.setProgress(seekPosition);
        }
    });

    return (
        <div className={containerClass}>
            <canvas ref={setCanvas} className={canvasClass} />

            <TimeIndicator />
        </div>
    );
}

function TimeIndicator() {
    const t = useTranslation("playback-bar");

    const [seekPosition, setSeekPosition] = useState(0);

    trpc.playback.getCurrentSeekPosition$.useSubscription(undefined, {
        onData(seekPosition) {
            setSeekPosition(seekPosition);
        }
    });

    const currentTrackId = useCurrentTrack();

    const {data: trackInfo} = trpc.tracks.getTrackInfo.useQuery({
        trackId: currentTrackId as number
    }, {
        enabled: currentTrackId !== null
    });

    if (!trackInfo) return null;

    const passedTimeStr = formatDuration(trackInfo.duration * seekPosition);
    const totalDurationStr = formatDuration(trackInfo.duration);

    return (
        <div className={timeIndicatorContainerClass}>
            <div className={timeIndicatorClass}>
                {t("track-seek-position", {
                    progress: passedTimeStr,
                    total: totalDurationStr
                })}
            </div>
        </div>
    );
}
