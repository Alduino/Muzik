import native from "rollup-plugin-natives";
import {defineConfig} from "vite";

export default defineConfig({
    resolve: {
        mainFields: ["module", "jsnext:main", "jsnext"]
    },
    plugins: [
        native({
            copyTo: ".vite/build"
        })
    ]
});
