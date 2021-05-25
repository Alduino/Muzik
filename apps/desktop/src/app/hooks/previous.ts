import {useEffect, useRef} from "react";

function usePrevious<T>(value: T): T | undefined;
function usePrevious<T>(value: T, initial: T): T;

function usePrevious<T>(value: T, initial?: T): T {
    const ref = useRef<T | undefined>(initial);
    useEffect(() => {
        ref.current = value;
    }, [value]);
    return ref.current as T;
}

export default usePrevious;
