const baseConfig = require("@muzik/config-webpack");
const {HotModuleReplacementPlugin} = require("webpack");

module.exports = (...config) => (env, argv) => {
    const config = baseConfig(...config)(env, argv);

    if (argv.mode === "development") {
        config.plugins.push(new HotModuleReplacementPlugin());
        config.watch = true;
        config.entry.unshift("webpack/hot/poll?100");
    }

    return config;
};
