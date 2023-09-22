import {defineConfig} from "tsup";

export default defineConfig({
    dts: true,
    sourcemap: true,
    format: ["esm"],
    entry: ["src/index.ts"]
});
