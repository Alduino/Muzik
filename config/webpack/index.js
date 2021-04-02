const {resolve} = require("path");
const {CleanWebpackPlugin} = require("clean-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

module.exports = dirname => (env, argv) => {
    const config = {
        mode: "production",
        entry: ["./src/index.tsx"],
        target: "node",
        output: {
            path: resolve(dirname, "dist"),
            filename: "index.js"
        },
        module: {
            rules: [
                {
                    test: /\.[jt]sx?$/,
                    exclude: /node_modules/,
                    use: {
                        loader: "babel-loader",
                        options: {
                            cacheDirectory: true,
                            cacheCompression: false
                        }
                    }
                },
                {
                    test: /\.(png|jpe?g|gif|svg|bmp|otf)$/,
                    use: [
                        {
                            loader: "file-loader",
                            options: {
                                publicPath: "dist"
                            }
                        }
                    ]
                },
                {
                    test: /\.node/,
                    use: [
                        {
                            loader: "native-addon-loader",
                            options: {
                                name: "[name]-[hash].[ext]"
                            }
                        }
                    ]
                }
            ]
        },
        plugins: [new CleanWebpackPlugin()],
        resolve: {
            extensions: [".tsx", ".ts", ".js", ".jsx", ".json"]
        }
    };

    if (argv.mode === "development") {
        config.mode = "development";
        config.plugins.push(new ForkTsCheckerWebpackPlugin());
        config.devtool = "source-map";
        config.watch = true;
    }

    return config;
};
