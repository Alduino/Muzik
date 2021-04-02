#!/bin/env node

import {dirname, basename, resolve, join} from "path";
import {
    readFileSync,
    writeFileSync,
    unlinkSync,
    existsSync,
    mkdirSync
} from "fs";
import {rollup, watch} from "rollup";
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import {terser} from "rollup-plugin-terser";
import json from "@rollup/plugin-json";

const __dirname = dirname(import.meta.url.substring("file://".length));

const {name, version} = JSON.parse(
    readFileSync(resolve(__dirname, "package.json"), "utf8")
);

function readOptions(args) {
    const entries = [];

    for (const option of args) {
        if (option.startsWith("--"))
            entries.unshift([option.substring(2), true]);
        else if (option.startsWith("-"))
            entries.unshift(
                ...option
                    .substring(1)
                    .split("")
                    .map(el => [el, true])
                    .reverse()
            );
        else if (entries.length === 0 || entries[0][1] !== true)
            throw new Error("invalid options format");
        else entries[0][1] = option;
    }

    return Object.fromEntries(entries);
}

/**
 * @param {"up"|"down"|"left"|"right"} direction
 * @param {number} count
 */
function moveCursor(direction, count) {
    const directionChar =
        direction === "up"
            ? "A"
            : direction === "down"
            ? "B"
            : direction === "left"
            ? "C"
            : direction === "right"
            ? "D"
            : null;

    if (directionChar === null) throw new Error("Invalid direction");

    console.log(`\x1b[${count}${directionChar}`);
}

function clearLine() {
    if (!process.stdout.isTTY) return;
    console.log("\x1b[K");
}

const optionsBase = readOptions(process.argv.slice(2));

if (optionsBase.help || optionsBase.h) {
    console.log(`${name} v${version}
--watch -w: watch the files
--minify -m: minify output
--format -f [format]: one or more of cjs,esm,iife separated by commas
--entry -e [file]: path to entry file
--out -o [file]: path to output file (without extension -> [file].[format].js)
--name -n [name]: name of iife module
--decl -d [dir]: directory for declaration files
`);
    process.exit();
}

const options = {
    watch: optionsBase.watch || optionsBase.w || false,
    minify: optionsBase.minify || optionsBase.m || false,
    entry: optionsBase.entry || optionsBase.e || null,
    formats: (optionsBase.format || optionsBase.f || null)?.split(","),
    out: optionsBase.outdir || optionsBase.o || null,
    moduleName: optionsBase.name || optionsBase.n || null,
    declarationDir: optionsBase.decl || optionsBase.t || null
};

console.log(
    "running with config:",
    Object.entries(options)
        .filter(e => e[1])
        .map(e => `${e[0]}=${JSON.stringify(e[1])}`)
        .join(" ")
);

if (!options.entry) throw new Error("--entry is required");
if (!options.out) throw new Error("--out is required");
if (!options.formats) throw new Error("--format is required");

if (options.formats.includes("iife") && !options.moduleName)
    throw new Error("--name is required with iife format");

if (!options.declarationDir)
    process.emitWarning("--decl not set, won't generate d.ts files");

if (options.declarationDir?.startsWith(dirname(options.out)))
    process.emitWarning(
        "--decl is relative to out, are you sure it is set correctly?"
    );

const sourcePackagePath = resolve("package.json");
if (!existsSync(sourcePackagePath))
    throw new Error("must be run in directory with package.json");

const sourcePackage = JSON.parse(readFileSync(sourcePackagePath, "utf8"));

const allDependencies = [
    ...Object.keys(sourcePackage.dependencies),
    Object.keys(sourcePackage.devDependencies)
];
if (!allDependencies.includes("tslib"))
    throw new Error("tslib package is not installed");

const cacheFile = resolve("cache", "rollup.json");

console.log("loading cache from", cacheFile);
mkdirSync(dirname(cacheFile), {recursive: true});
let cache = existsSync(cacheFile)
    ? JSON.parse(readFileSync(cacheFile, "utf8"))
    : null;

function setCache(c) {
    console.log("writing cache");
    cache = c;
    writeFileSync(cacheFile, JSON.stringify(c));
}

// temporarily copy tsconfig to the working directory first
// only needed while typescript plugin is being created
const tsconfigPath = resolve(__dirname, "../../tsconfig.json");

const localTsconfigPath = resolve("tsconfig.json");
const existingTsconfig = existsSync(localTsconfigPath);

if (!existingTsconfig) {
    console.log("copying tsconfig.json to working directory");
    writeFileSync(localTsconfigPath, readFileSync(tsconfigPath));
}

/** @type {InputOptions} */
const inputOptions = {
    input: options.entry,

    external(id) {
        return /node_modules/.test(id);
    },

    plugins: [
        nodeResolve(),
        commonjs(),
        typescript({
            allowSyntheticDefaultImports: true,
            declaration: !!options.declarationDir,
            emitDeclarationOnly: !!options.declarationDir,
            declarationDir: options.declarationDir,
            tsconfig: localTsconfigPath
        }),
        json()
    ]
};

if (!existingTsconfig) {
    console.log("removing temporary tsconfig.json");
    unlinkSync(localTsconfigPath);
}

const outputPlugins = [];
if (options.minify) outputPlugins.push(terser());

/** @type {OutputOptions[]} */
const outputOptions = options.formats.map(format => ({
    file: `${options.out}.${format}.js`,
    format,
    plugins: outputPlugins,
    sourcemap: true
}));

const bundle = await rollup(inputOptions).catch(err => {
    if (err.code === "PARSE_ERROR") {
        console.error(err.frame);
        console.error(err.message);
        console.error(
            "at",
            basename(err.loc.file) + ":" + err.loc.line + ":" + err.loc.column
        );
    } else {
        console.error(err);
    }
    process.exit(1);
});

setCache(bundle.cache);

for (const op of outputOptions) {
    console.log("writing", op.file);
    await bundle.write(op);
}

console.log("\nChanges to make to package.json:");

const outputCjsPath = options.out + ".cjs.js";
if (options.formats.includes("cjs") && sourcePackage.main !== outputCjsPath)
    console.log(`- set "main" field in package.json to ${outputCjsPath}`);

const outputEsmPath = options.out + ".esm.js";
if (options.formats.includes("esm") && sourcePackage.module !== outputEsmPath)
    console.log(`- set "module" field in package.json to ${outputEsmPath}`);

const outputTypesPath =
    options.declarationDir &&
    join(
        dirname(options.out),
        options.declarationDir,
        basename(options.out) + ".d.ts"
    );
if (options.declarationDir && sourcePackage.types !== outputTypesPath)
    console.log(`- set "types" field in package.json to ${outputTypesPath}`);

console.log("");

if (options.watch) {
    console.log("watching...");

    const watcher = watch({
        ...inputOptions,
        output: outputOptions,
        watch: {
            clearScreen: true
        }
    });

    let buildStates = new Map();

    let previousLinesToClear = 0;

    function clear() {
        for (let i = 0; i < buildStates.size + previousLinesToClear; i++) {
            clearLine();
        }

        moveCursor("up", buildStates.size + previousLinesToClear + 1);

        previousLinesToClear = 0;
    }

    function displayBuildStates() {
        if (!process.stdout.isTTY) return;

        for (const [, state] of buildStates) {
            const displayName = state.output.map(f => basename(f)).join(", ");

            if (!state.complete) {
                console.log(displayName, "=>", "bundling...");
            } else {
                console.log(
                    displayName,
                    "=>",
                    "complete in",
                    state.duration,
                    "ms"
                );
            }
        }

        moveCursor("up", buildStates.size + 1);
    }

    watcher.on("event", ({result, code, ...event}) => {
        const buildStateKey = JSON.stringify(event.output);
        const displayName = event.output?.map(f => basename(f)).join(", ");

        if (code === "END") {
            previousLinesToClear = buildStates.size;
            buildStates.clear();
        } else if (code === "BUNDLE_START") {
            clear();
            buildStates.set(buildStateKey, {
                input: event.input,
                output: event.output,
                complete: false
            });
            displayBuildStates();

            if (!process.stdout.isTTY)
                console.log(displayName, "=>", "bundling...");
        } else if (code === "BUNDLE_END") {
            clear();
            buildStates.set(buildStateKey, {
                ...buildStates.get(buildStateKey),
                duration: event.duration,
                complete: true
            });
            displayBuildStates();

            if (!process.stdout.isTTY) {
                console.log(
                    displayName,
                    "=>",
                    "complete in",
                    event.duration,
                    "ms"
                );
            }
        } else if (code === "ERROR") {
            console.error(event.error);
        }

        if (result) result.close();
    });
} else {
    console.log("Done. Thank you.");
}
