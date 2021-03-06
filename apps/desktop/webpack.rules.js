module.exports = [
    {
        test: /\.tsx?$/,
        exclude: /(node_modules|\.webpack)/,
        use: {
            loader: "ts-loader",
            options: {
                transpileOnly: true
            }
        }
    },
    {
        test: /\.(svg|png|jpe?g|gif|woff2?|mp3)$/i,
        use: [
            {
                loader: "file-loader"
            }
        ]
    }
];

module.exports.main = [
    // Add support for native node modules
    {
        test: /\.node$/,
        use: "node-loader"
    },
    {
        test: /\.(m?js|node)$/,
        parser: {amd: false},
        use: {
            loader: "@timfish/webpack-asset-relocator-loader",
            options: {
                outputAssetBase: "native_modules"
            }
        }
    },
    ...module.exports
];
