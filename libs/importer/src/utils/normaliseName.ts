import {normalizeSync} from "normalize-diacritics";

// Only english prefixes for now
const PREFIXES = ["THE", "A", "AN"];

export function normaliseName(name: string) {
    name = name.toUpperCase();
    name = normalizeSync(name);
    name = name.replace(/['’]/g, "");
    name = name.replace(/\W+/g, " ");
    name = name.trim();

    for (const prefix of PREFIXES) {
        if (name.startsWith(`${prefix} `)) {
            name = name.slice(prefix.length + 1) + `, ${prefix}`;
            break;
        }
    }

    return name;
}
