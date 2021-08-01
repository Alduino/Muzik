#!/usr/bin/env node

import {platform as getPlatform} from "os";
import {join} from "path";
import {exec} from "child_process";
import {existsSync, readdirSync, renameSync} from "fs";
import {version} from "../package.json";

const platform = getPlatform();
const args = ["pnpx", "electron-builder", "build"];

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

if (process.env.GITHUB_WORKFLOW?.toLowerCase() === "release") {
    console.log("Release workflow, will publish to Github releases.");
    const ref = process.env.GITHUB_REF;
    if (!ref || !ref.startsWith("refs/tags/"))
        throw new Error("no tag found (GITHUB_REF is not set or does not start with refs/tags)");

    const releaseName = ref.substring("refs/tags/".length);

    if (!releaseName.startsWith("v"))
        throw new Error("invalid release name, it should start with `v`, not just be plain semver");

    if (releaseName !== `v${version}`)
        throw new Error(`app version is ${version}, expected ${releaseName.substring("v".length)}`);

    args.push("--release", "always");
}

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
const cp = exec(args.join(" "));
cp.stdout.pipe(process.stdout);
cp.stderr.pipe(process.stderr);
