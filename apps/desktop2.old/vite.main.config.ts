import {resolve} from "path";
import {defineConfig} from "vite";
import commonjs from "vite-plugin-commonjs";
import native from "vite-plugin-native";
import {viteStaticCopy} from "vite-plugin-static-copy";

export default defineConfig({
    resolve: {
        mainFields: ["module", "jsnext:main", "jsnext"]
    },
    plugins: [
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
                    src: "node_modules/@muzik/importer/dist/*",
                    dest: "importer"
                }
            ]
        }),
        commonjs(),
        native({
            outDir: ".vite/build"
        })
    ],
    build: {
        rollupOptions: {
            external: ["sharp"]
        }
    }
});
