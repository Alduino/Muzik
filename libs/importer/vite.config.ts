import {readdirSync} from "fs";
import {defineConfig} from "vite";

export default defineConfig({
    build: {
        lib: {
            entry: readdirSync("src/workers").map(
                file => `src/workers/${file}`
            ),
            name: "workers",
            formats: ["cjs"]
        },
        outDir: "dist/workers",
        rollupOptions: {
            external: ["sharp"]
        }
    }
});
