import {defaultPlugins} from "./build-base";
import autoreload from "@muzik/rollup-plugin-autoreload";

export default {
    input: "src/main/index.ts",
    output: {
        dir: "build/main",
        format: "cjs",
        sourcemap: true
    },
    preserveEntrySignatures: false,
    plugins: [...defaultPlugins, autoreload({server: false})],
    external: ["electron"]
};
