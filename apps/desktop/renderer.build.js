import html from "@rollup/plugin-html";
import replace from "@rollup/plugin-replace";
import disallow from "@muzik/rollup-plugin-disallow-module";
import nodePolyfills from "rollup-plugin-polyfill-node";
import progress from "rollup-plugin-progress";
import {defaultPlugins} from "./build-base";

export default {
    input: "src/renderer/index.tsx",
    output: {
        dir: "build/renderer",
        format: "esm",
        sourcemap: true
    },
    preserveEntrySignatures: false,
    plugins: [
        disallow({
            modules: [["long", "warn-return"]]
        }),
        replace({
            "process.env.NODE_ENV": JSON.stringify(
                process.env.NODE_ENV || "development"
            ),
            "process.env.ROARR_LOG": JSON.stringify(process.env.ROARR_LOG),
            __dirname: JSON.stringify(""),
            preventAssignment: true
        }),
        nodePolyfills(),
        html({
            title: "Muzik"
        }),
        progress(),
        ...defaultPlugins
    ],
    external: [/^electron/]
};
