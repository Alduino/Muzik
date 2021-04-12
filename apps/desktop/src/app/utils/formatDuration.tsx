export function formatDuration(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const minutesPadded = minutes.toString().padStart(2, "0");
    const secondsPadded = seconds.toString().padStart(2, "0");

    return `${minutesPadded}:${secondsPadded}`;
}
