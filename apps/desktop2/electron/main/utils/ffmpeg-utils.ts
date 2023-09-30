export interface AudioStream {
    duration: string;
    sample_rate: string;
}

export function getAudioFrameCount(stream: AudioStream): number {
    if (!stream.duration) throw new Error("No duration");
    if (!stream.sample_rate) throw new Error("No sample rate");

    const duration = parseFloat(stream.duration);
    if (Number.isNaN(duration)) throw new Error("Invalid duration");

    return Math.round(duration * parseInt(stream.sample_rate));
}
