import {useMemo} from "react";
import {LetterCounts} from "../components/lib/ScrollBarAlphabetViewer";

function count<T>(items: T[]) {
    const map = new Map<T, number>();

    for (const item of items) {
        if (map.has(item)) map.set(item, map.get(item) + 1);
        else map.set(item, 1);
    }

    return map;
}

export default function useLetterCounts(letters: string[]): LetterCounts {
    return useMemo<LetterCounts>(() => {
        const filtered = letters.filter(letter => letter.trim().length === 1);
        const counts = count(filtered);
        return Object.fromEntries(counts.entries());
    }, [letters]);
}
