export function split(source: string): string[] {
    const match = source.match(/[A-Z_ -]?[^A-Z_ -]*/g);
    return (
        match
            ?.slice(0, -1)
            .map(el => el.trim())
            .filter(el => el)
            .map(el => el.toLowerCase()) ?? []
    );
}

// Joins to camelCase
export function joinCamel(split: string[]): string {
    return split
        .slice(1)
        .reduce(
            (accum, val) => accum + val[0].toUpperCase() + val.slice(1),
            split[0]
        );
}

// joins to PascalCase
export function joinPascal(split: string[]): string {
    return split.reduce(
        (accum, val) => accum + val[0].toUpperCase() + val.slice(1),
        ""
    );
}

// joins to dash-separated
export function joinDashed(split: string[]): string {
    return split.join("-");
}

// joins to underscore_separated
export function joinUndescored(split: string[]): string {
    return split.join("_");
}
