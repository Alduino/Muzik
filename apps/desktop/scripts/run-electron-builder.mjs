#!/usr/bin/env node

import {platform as getPlatform} from "os";
import {resolve, dirname} from "path";
import {spawn} from "child_process";

const platform = getPlatform();
const args = [resolve(dirname(new URL(import.meta.url).pathname), "../node_modules/.bin/electron-builder"), "build"];

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
console.log("Running", args.join(" "));

spawn(args[0], args.slice(1), {stdio: "inherit"});
