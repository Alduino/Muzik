/* eslint-disable @typescript-eslint/no-var-requires */

const {MakerDeb} = require("@electron-forge/maker-deb");
const {MakerRpm} = require("@electron-forge/maker-rpm");
const {MakerSquirrel} = require("@electron-forge/maker-squirrel");
const {MakerZIP} = require("@electron-forge/maker-zip");
const {VitePlugin} = require("@electron-forge/plugin-vite");

/**
 * @type {import("@electron-forge/shared-types").ForgeConfig}
 */
const config = {
    packagerConfig: {},
    rebuildConfig: {},
    makers: [
        new MakerSquirrel({}),
        new MakerZIP({}, ["darwin"]),
        new MakerDeb({}),
        new MakerRpm({})
    ],
    plugins: [
        new VitePlugin({
            build: [
                {
                    entry: "src/index.ts",
                    config: "config/vite.main.config.ts"
                },
                {
                    entry: "src/preload.js",
                    config: "config/vite.preload.config.ts"
                }
            ],
            renderer: [
                {
                    name: "main_window",
                    config: "config/vite.renderer.config.ts"
                }
            ]
        })
    ]
};

module.exports = config;
