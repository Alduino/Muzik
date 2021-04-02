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
import dts from "rollup-plugin-dts";

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
--minify -m: minify output
--format -f [format]: one or more of cjs,esm,iife separated by commas
--entry -e [file]: path to entry file
--out -o [file]: path to output file (without extension -> [file].[format].js)
--name -n [name]: name of iife module
--decl -d [file]: declaration file output
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
    declaration: optionsBase.decl || optionsBase.t || null
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

if (!options.declaration)
    process.emitWarning("--decl not set, won't generate d.ts files");

if (options.declaration?.startsWith(dirname(options.out)))
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
            declaration: false,
            tsconfig: localTsconfigPath
        }),
        json()
    ]
};

/** @type {InputOptions} */
const dtsInputOptions = {
    input: options.entry,
    plugins: [dts()]
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

function printErr(err) {
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
}

const bundle = await rollup(inputOptions).catch(printErr);

setCache(bundle.cache);

for (const op of outputOptions) {
    console.log("writing", op.file);
    await bundle.write(op);
}

console.log("generating dts bundle");

if (options.declaration) {
    const dtsBundle = await rollup(dtsInputOptions).catch(printErr);
    await dtsBundle.write({
        file: `${join(dirname(options.out), options.declaration)}.d.ts`,
        format: "esm"
    });
}

console.log("\nChanges to make to package.json:");

const outputCjsPath = options.out + ".cjs.js";
if (options.formats.includes("cjs") && sourcePackage.main !== outputCjsPath)
    console.log(`- set "main" field in package.json to ${outputCjsPath}`);

const outputEsmPath = options.out + ".esm.js";
if (options.formats.includes("esm") && sourcePackage.module !== outputEsmPath)
    console.log(`- set "module" field in package.json to ${outputEsmPath}`);

const outputTypesPath = options.declaration && join(dirname(options.out), options.declaration + ".d.ts");
if (options.declaration && sourcePackage.types !== outputTypesPath)
    console.log(`- set "types" field in package.json to ${outputTypesPath}`);

console.log("");
console.log("Done. Thank you.");
