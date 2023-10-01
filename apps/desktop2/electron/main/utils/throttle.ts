export function throttle<Args extends readonly unknown[]>(
    fn: (...args: Args) => void,
    minIntervalMs: number
): (...args: Args) => void {
    let lastCallTime = -Infinity;

    return (...args: Args) => {
        const now = performance.now();
        const diff = now - lastCallTime;

        if (diff >= minIntervalMs) {
            lastCallTime = now;
            fn(...args);
        }
    };
}
