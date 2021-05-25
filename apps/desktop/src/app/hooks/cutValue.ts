import {useCallback, useEffect, useState} from "react";
import usePrevious from "./previous";

/**
 * Uses the value from the last change of `edge`
 */
export function useToggleCutValue<T>(value: T, edge: boolean): T {
    const [result, setResult] = useState(value);
    const previous = usePrevious(edge);

    useEffect(() => {
        if (edge !== previous) setResult(value);
    }, [edge, previous, value]);

    return result;
}

/**
 * Uses the value from the last rising edge of `edge`
 */
export function useRisingCutValue<T>(value: T, edge: boolean): T {
    const [result, setResult] = useState(value);
    const previous = usePrevious(edge);

    useEffect(() => {
        if (!previous && edge) setResult(value);
    }, [edge, previous, result]);

    return result;
}

/**
 * Uses the value from the last time the callback was called
 */
export function useImpCutValue<T>(value: T): [T, () => void] {
    const [result, setResult] = useState(value);
    const cb = useCallback(() => setResult(value), [value]);
    return [result, cb];
}
