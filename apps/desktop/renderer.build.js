import html from "@rollup/plugin-html";
import replace from "@rollup/plugin-replace";
import nodeGlobals from "rollup-plugin-node-globals";
import autoreload from "@muzik/rollup-plugin-autoreload";
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
        ...defaultPlugins,
        html({
            title: "Muzik"
        }),
        nodeGlobals(),
        autoreload(),
        replace({
            "process.env.NODE_ENV": JSON.stringify(
                process.env.NODE_ENV || "development"
            )
        })
    ]
};
