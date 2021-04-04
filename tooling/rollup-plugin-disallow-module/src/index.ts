import {Plugin} from "rollup";

/**
 * First value is matcher, string matches exactly, regex uses test
 * Second value:
 * - error: Throws an error if something imports the module
 * - warn: Writes a warning in the console if something imports the module, returns the normal value
 * - return-undef: Returns undefined from the module
 * - warn-return: Same as warn, but returns undefined from the module
 */
type Module = [
    string | RegExp,
    "error" | "warn" | "return-undef" | "warn-return"
];

export interface DisallowModuleOptions {
    modules: Module[];
}

const MODULE_PREFIX = "\0disallow-module:";

/**
 * Attempts to find a matching module declaration, and returns its index
 */
function match(id: string, modules: Module[]): number {
    for (let i = 0; i < modules.length; i++) {
        const [matcher] = modules[i];

        if (typeof matcher === "string") {
            if (id === matcher) return i;
        } else {
            if (matcher.test(id)) return i;
        }
    }

    return -1;
}

export default function disallow(options: DisallowModuleOptions): Plugin {
    return {
        name: "disallow-module",

        resolveId(id) {
            const index = match(id, options.modules);
            if (index > -1) return MODULE_PREFIX + index;
            return null;
        },

        load(id) {
            if (!id.startsWith(MODULE_PREFIX)) return null;
            const index = parseInt(id.substring(MODULE_PREFIX.length));
            const [matcher, type] = options.modules[index];

            switch (type) {
                case "error":
                    throw new Error(`Importing disallowed module ${matcher}`);
                case "warn":
                    console.warn("Importing disallowed module", matcher);
                    return null;
                case "return-undef":
                    return "export default void 0;";
                case "warn-return":
                    console.warn("Importing disallowed module", matcher);
                    return "export default void 0;";
            }
        }
    };
}
