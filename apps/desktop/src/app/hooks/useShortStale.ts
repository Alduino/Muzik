import {useEffect} from "react";
import {useImpCutValue} from "./cutValue";

export function useShortStale<T>(value: T, edge: boolean, staleTime = 300): T {
    const [result, cut] = useImpCutValue(value);

    useEffect(() => {
        if (edge) return;

        const timeout = setTimeout(() => cut(), staleTime);
        return () => clearTimeout(timeout);
    }, [edge, cut, staleTime]);

    useEffect(() => {
        if (!edge) return;
        cut();
    }, [edge, cut]);

    return result;
}
