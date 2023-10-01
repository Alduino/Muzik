import {log} from "../logger.ts";
import {DataReader} from "./DataReader.ts";

interface BucketData {
    // Channel → Sum of squares
    channelValues: number[];
    frameCount: number;
}

export interface WaveformBucketCalculatorOptions<T> {
    bucketCount: number;
    channelCount: number;
    frameCount: number;
    dataReader: DataReader<T>;
}

export class WaveformBucketCalculator<T = unknown> {
    readonly #channelCount: number;
    readonly #buckets: BucketData[];
    readonly #dataReader: DataReader<T>;
    readonly #framesPerBucket: number;
    #currentSampleOffset = 0;

    constructor(options: WaveformBucketCalculatorOptions<T>) {
        this.#channelCount = options.channelCount;
        this.#dataReader = options.dataReader;

        this.#framesPerBucket = Math.floor(
            options.frameCount / options.bucketCount
        );

        log.debug(
            {framesPerBucket: this.#framesPerBucket},
            "Creating waveform bucket calculator"
        );

        this.#buckets = Array.from({length: options.bucketCount}, () =>
            this.#createBucket()
        );
    }

    update(data: T) {
        const sampleCount = this.#dataReader.getLength(data);

        for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex++) {
            const sampleValue = this.#dataReader.read(data, sampleIndex);

            this.#readSample(
                this.#currentSampleOffset + sampleIndex,
                sampleValue
            );
        }

        this.#currentSampleOffset += sampleCount;
    }

    /**
     * Returns an array of buckets, each containing that bucket's RMS value for each channel.
     * Values are normalised to be between zero and one.
     * If any buckets are empty, their RMS values default to zero.
     */
    digest(): number[][] {
        const rmsValues = this.#buckets.map(bucket => {
            return bucket.channelValues.map(channelSum => {
                if (bucket.frameCount === 0) return 0;
                return Math.sqrt(channelSum / bucket.frameCount);
            });
        });

        const channelMinMaxValues = Array.from(
            {length: this.#channelCount},
            (_, channelId) => {
                let min = Infinity;
                let max = 0;

                for (const rmsValue of rmsValues) {
                    const value = rmsValue[channelId];

                    if (value !== 0 && value < min) min = value;
                    if (value > max) max = value;
                }

                if (min === Infinity) min = 0;

                return {min, max};
            }
        );

        return rmsValues.map(bucket => {
            return bucket.map((channelValue, channelId) => {
                if (channelValue === 0) return 0;
                const {min, max} = channelMinMaxValues[channelId];
                if (min === max) return 0;
                return (channelValue - min) / (max - min);
            });
        });
    }

    #createBucket(): BucketData {
        return {
            channelValues: new Array(this.#channelCount).fill(0),
            frameCount: 0
        };
    }

    #readSample(sampleIndex: number, sampleValue: number) {
        const frameIndex = Math.floor(sampleIndex / this.#channelCount);
        const channelId = sampleIndex % this.#channelCount;

        const bucketIndex = Math.min(
            this.#buckets.length - 1,
            Math.floor(frameIndex / this.#framesPerBucket)
        );

        const bucket = this.#buckets[bucketIndex];

        if (channelId === 0) bucket.frameCount++;
        bucket.channelValues[channelId] += sampleValue ** 2;
    }
}
