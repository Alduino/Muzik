import {useEffect, useRef} from "react";
import useEventHandler from "../hooks/useEventHandler.ts";
import {trpc} from "../utils/trpc.ts";
import useResizeObserver from "use-resize-observer";
import {PLAYBACK_SAMPLE_RATE} from "../../shared/audio/constants.ts";

function freqToFftIndex(freq: number, sampleRate: number, fftSize: number): number {
    return Math.round(freq / sampleRate * fftSize);
}

export interface FrequencyVisualiserProps {
    className?: string;

    widthToGapRatio?: number;
    barCount?: number;

    fillColour?: string;

    minFrequency?: number;
    maxFrequency?: number;
}

export function FrequencyVisualiser({className, widthToGapRatio = 0.75, barCount = 3, fillColour = "#fff", minFrequency = 20, maxFrequency = 12000}: FrequencyVisualiserProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const barHeightsRef = useRef<number[]>([]);

    const {width: canvasWidth, height: canvasHeight} = useResizeObserver({
        ref: canvasRef,
        box: "device-pixel-content-box"
    });

    const handleFrequencyData = useEventHandler((data: Uint32Array) => {
        const minFftIndex = freqToFftIndex(minFrequency, PLAYBACK_SAMPLE_RATE, data.length);
        const maxFftIndex = freqToFftIndex(maxFrequency, PLAYBACK_SAMPLE_RATE, data.length);
        const croppedData = data.slice(minFftIndex, maxFftIndex);

        const minAmplitude = 0;
        const maxAmplitude = 0xbfffffff;
        const scaledData = Array.from(croppedData).map(amplitude => {
            const scaled = (amplitude - minAmplitude) / (maxAmplitude - minAmplitude);
            return scaled ** 3;
        });

        barHeightsRef.current = Array.from({length: barCount}, (_, i) => {
            // Logarithmic bar index to frequency scale

            const barStartIndex = freqToFftIndex(minFrequency * (maxFrequency / minFrequency) ** (i / barCount), PLAYBACK_SAMPLE_RATE, scaledData.length);
            const barEndIndex = freqToFftIndex(minFrequency * (maxFrequency / minFrequency) ** ((i + 1) / barCount), PLAYBACK_SAMPLE_RATE, scaledData.length);

            return scaledData.slice(barStartIndex, barEndIndex).reduce((sum, amplitude) => sum + amplitude, 0) / (barEndIndex - barStartIndex);
        });
    });

    useEffect(() => {
        let barHeights = barHeightsRef.current;

        let running = true;
        function frame() {
            if (!running) return;
            requestAnimationFrame(frame);

            const canvas = canvasRef.current;
            if (!canvas) return;
            const canvasWidth = canvas.width, canvasHeight = canvas.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            const targetBarHeights = barHeightsRef.current;

            if (barHeights.length !== targetBarHeights.length) {
                barHeights = targetBarHeights;
            }

            barHeights = barHeights.map((currentHeight, i) => {
                const targetHeight = targetBarHeights[i];
                const diff = targetHeight - currentHeight;
                const speed = 0.03;
                return currentHeight + diff * speed;
            });

            ctx.clearRect(0, 0, canvasWidth, canvasHeight);

            const barWidth = (canvasWidth / barHeights.length) * widthToGapRatio;
            const barGap = (canvasWidth / (barHeights.length - 1)) * (1 - widthToGapRatio);

            ctx.fillStyle = fillColour;
            for (let i = 0; i < barHeights.length; i++) {
                const barX = i * (barWidth + barGap);
                const barHeight = barHeights[i] * canvasHeight;
                const barY = canvasHeight - barHeight;

                ctx.fillRect(barX, barY, barWidth, barHeight);
            }
        }

        requestAnimationFrame(frame);
        return () => { running = false };
    }, []);

    trpc.playback.watchFrequencyBins$.useSubscription(undefined, {
        onData: handleFrequencyData
    });

    return (
        <canvas ref={canvasRef} className={className} width={canvasWidth} height={canvasHeight} />
    );
}
