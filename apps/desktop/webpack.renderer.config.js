// eslint-disable-next-line @typescript-eslint/no-var-requires
const {resolve} = require("path");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const plugins = require("./webpack.plugins");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rules = require("./webpack.rules");

rules.push({
    test: /\.css$/,
    use: [{loader: "style-loader"}, {loader: "css-loader"}]
});

module.exports = {
    module: {
        rules
    },
    target: "electron-renderer",
    plugins: plugins,
    resolve: {
        extensions: [".js", ".ts", ".jsx", ".tsx", ".css"],
        modules: [
            "node_modules",
            resolve(__dirname, "node_modules"),
            resolve(__dirname, "../../node_modules")
        ]
    }
};
