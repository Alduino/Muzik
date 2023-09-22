import {defineConfig} from "tsup";

export default defineConfig({
    dts: true,
    sourcemap: true,
    format: ["cjs", "esm"],
    entry: ["src/index.ts"]
});
