import {
    Dispatch,
    SetStateAction,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";

export interface UseBooleanController {
    on(): void;

    off(): void;

    toggle(): void;
}

export type UseBooleanResult = [
    state: boolean,
    controller: UseBooleanController & Dispatch<SetStateAction<boolean>>
];

/**
 * Returns a boolean state with some helper functions
 * @param initialValue The initial value to set the state to
 * @param canUpdate If this is false, updates will be ignored
 */
export function useBoolean(
    initialValue: boolean | (() => boolean),
    canUpdate = true
): UseBooleanResult {
    const [state, setState] = useState(initialValue);

    const canUpdateRef = useRef(canUpdate);

    useEffect(() => {
        canUpdateRef.current = canUpdate;
    }, [canUpdateRef, canUpdate]);

    const set = useCallback(
        (value: SetStateAction<boolean>) => {
            if (!canUpdateRef.current) return;
            setState(value);
        },
        [canUpdateRef, setState]
    );

    const on = useCallback(() => set(true), [set]);
    const off = useCallback(() => set(false), [set]);
    const toggle = useCallback(() => set(p => !p), [set]);

    const controller = useMemo(() => {
        const setFn = set.bind(null);

        const result = setFn as UseBooleanResult[1];

        result.on = on;
        result.off = off;
        result.toggle = toggle;

        return result;
    }, [on, off, toggle, set]);

    return [state, controller];
}
