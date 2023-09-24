import native from "rollup-plugin-natives";
import {defineConfig} from "vite";
import commonjs from "vite-plugin-commonjs";
import {viteStaticCopy} from "vite-plugin-static-copy";

export default defineConfig({
    resolve: {
        mainFields: ["module", "jsnext:main", "jsnext"]
    },
    plugins: [
        native({
            copyTo: ".vite/build"
        }),
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
                }
            ]
        })
    ]
});
