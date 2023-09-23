import {defineConfig} from "tsup";

export default defineConfig({
    dts: true,
    sourcemap: true,
    clean: true,
    format: ["cjs"],
    entry: ["src/index.ts", "src/workers/*.ts"]
});
