const baseConfig = require("@muzik/config-webpack");
const {HotModuleReplacementPlugin} = require("webpack");

module.exports = (...args) => (env, argv) => {
    const config = baseConfig(...args)(env, argv);

    if (argv.mode === "development") {
        config.plugins.push(new HotModuleReplacementPlugin());
        config.watch = true;
        config.entry.unshift("webpack/hot/poll?100");
    }

    return config;
};
