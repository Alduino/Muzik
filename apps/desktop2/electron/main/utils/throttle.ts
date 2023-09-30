export function throttle<Args extends readonly unknown[]>(
    fn: (...args: Args) => void,
    minIntervalMs: number
): (...args: Args) => void {
    let lastCallTime = -Infinity;

    return (...args: Args) => {
        const now = performance.now();

        if (now - lastCallTime >= minIntervalMs) {
            lastCallTime = now;
            fn(...args);
        }
    };
}
