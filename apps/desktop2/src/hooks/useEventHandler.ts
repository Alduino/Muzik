import {useInsertionEffect, useLayoutEffect, useRef} from "react";

// Slightly modified version of:
// https://github.com/scottrippey/react-use-event-hook - MIT License

/**
 * Suppress the warning when using useLayoutEffect with SSR. (https://reactjs.org/link/uselayouteffect-ssr)
 * Make use of useInsertionEffect if available.
 */
const useBrowserEffect =
    typeof window !== "undefined"
        ? useInsertionEffect ?? useLayoutEffect
        : () => {
              /* noop */
          };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BaseFn = (...args: any) => void | Promise<void>;

/**
 * Similar to useCallback, with a few subtle differences:
 * - The returned function is a stable reference, and will always be the same between renders
 * - No dependency lists required
 * - Properties or state accessed within the callback will always be "current"
 */
export default function useEventHandler<T extends BaseFn>(callback: T): T {
    // Keep track of the latest callback:
    const latestRef = useRef<T>(
        useEventHandler_shouldNotBeInvokedBeforeMount as T
    );
    useBrowserEffect(() => {
        latestRef.current = callback;
    }, [callback]);

    // Create a stable callback that always calls the latest callback:
    // using useRef instead of useCallback avoids creating and empty array on every render
    const stableRef = useRef<T | null>(null);
    if (!stableRef.current) {
        stableRef.current = function (this: unknown, ...args: Parameters<T>) {
            return latestRef.current.apply(this, args);
        } as T;
    }

    return stableRef.current;
}

/**
 * Render methods should be pure, especially when concurrency is used,
 * so we will throw this error if the callback is called while rendering.
 */
function useEventHandler_shouldNotBeInvokedBeforeMount() {
    throw new Error(
        "The callback from useEventHandler cannot be invoked before the component has mounted."
    );
}
