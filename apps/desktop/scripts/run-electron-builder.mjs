#!/usr/bin/env node

import {platform as getPlatform} from "os";
import {resolve, dirname, join} from "path";
import {spawn} from "child_process";
import {renameSync, existsSync, readdirSync} from "fs";
import {fileURLToPath} from "url";

const platform = getPlatform();
const args = [resolve(dirname(fileURLToPath(import.meta.url)), "../node_modules/.bin/electron-builder"), "build"];

switch (platform) {
    case "darwin":
        args.push("--mac");
        break;
    case "linux":
        args.push("--linux");
        break;
    case "win32":
        args.push("--win");
        break;
    default:
        throw new Error("Builds on " + platform + " are not supported yet");
}

console.log("Detected platform:", platform);

if (existsSync(".webpack")) {
    console.log("Moving .webpack to build for electron-builder compat");
    renameSync(".webpack", "build");
}

if (!existsSync("build")) {
    throw new Error("build directory must exist");
}

console.log("Moving build/renderer/* to build/renderer/main_window");

const directory = readdirSync("build/renderer");
for (const file of directory) {
    if (file === "main_window") continue;
    renameSync(join("build/renderer", file), join("build/renderer/main_window", file));
}

console.log("Running", args.join(" "));
spawn(args[0], args.slice(1), {stdio: "inherit"});
