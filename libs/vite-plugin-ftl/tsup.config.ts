import {defineConfig} from "tsup";

export default defineConfig({
    dts: true,
    sourcemap: true,
    clean: true,
    format: ["esm"],
    entry: ["src/index.ts", "src/workers/*.ts"]
});
