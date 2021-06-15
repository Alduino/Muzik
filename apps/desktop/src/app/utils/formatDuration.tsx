export function formatDuration(totalSeconds: number): `${number}:${number}` {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const minutesPadded = minutes.toString().padStart(2, "0") as `${number}`;
    const secondsPadded = seconds.toString().padStart(2, "0") as `${number}`;

    return `${minutesPadded}:${secondsPadded}` as const;
}
