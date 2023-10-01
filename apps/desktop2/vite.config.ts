import {readdirSync} from "fs";
import path from "node:path";
import ftl from "@muzik/vite-plugin-ftl";
import {vanillaExtractPlugin} from "@vanilla-extract/vite-plugin";
import react from "@vitejs/plugin-react";
import {defineConfig} from "vite";
import commonjs from "vite-plugin-commonjs";
import electron from "vite-plugin-electron/simple";
import {viteStaticCopy} from "vite-plugin-static-copy";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        ftl(),
        vanillaExtractPlugin(),
        electron({
            main: {
                entry: {
                    main: "electron/main.ts",
                    ...Object.fromEntries(
                        readdirSync("electron/workers").map(worker => [
                            `workers/${worker.replace(/\.ts$/, "")}`,
                            `electron/workers/${worker}`
                        ])
                    )
                },
                vite: {
                    plugins: [
                        commonjs(),
                        viteStaticCopy({
                            targets: [
                                {
                                    src: "node_modules/@muzik/db/prisma/schema.prisma",
                                    dest: ""
                                },
                                {
                                    src: "node_modules/@muzik/db/prisma/migrations",
                                    dest: ""
                                },
                                {
                                    src: "node_modules/@muzik/importer/dist/workers",
                                    dest: ""
                                },
                                {
                                    src: "../../node_modules/piscina/dist/src/worker.js",
                                    dest: ""
                                },
                                {
                                    src: "../../node_modules/piscina/dist/src/common.js",
                                    dest: ""
                                }
                            ]
                        })
                    ],
                    build: {
                        rollupOptions: {
                            external: ["sharp"]
                        }
                    }
                }
            },
            preload: {
                // Shortcut of `build.rollupOptions.input`.
                // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
                input: path.join(__dirname, "electron/preload.ts")
            },
            // Ployfill the Electron and Node.js built-in modules for Renderer process.
            // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
            renderer: {}
        })
    ]
});
