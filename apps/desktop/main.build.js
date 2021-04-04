import {defaultPlugins} from "./build-base";

export default {
    input: "src/main/index.ts",
    output: {
        dir: "build/main",
        format: "cjs",
        sourcemap: true
    },
    preserveEntrySignatures: false,
    plugins: defaultPlugins,
    external: ["electron"]
};
