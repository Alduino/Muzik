// eslint-disable-next-line @typescript-eslint/no-var-requires
const {resolve} = require("path");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rules = require("./webpack.rules");

module.exports = {
    /**
     * This is the main entry point for your application, it's the first file
     * that runs in the main process.
     */
    entry: "./src/index.ts",
    target: "electron-main",
    // Put your normal webpack config below here
    module: {
        rules: rules.main
    },
    resolve: {
        extensions: [".js", ".ts", ".jsx", ".tsx", ".css", ".json"],
        modules: [
            "node_modules",
            resolve(__dirname, "node_modules"),
            resolve(__dirname, "../../node_modules")
        ]
    },
    externals: ["sqlite3"]
};
