import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import wasm from "@rollup/plugin-wasm";
import {terser} from "rollup-plugin-terser";

const defaultPlugins = [
    wasm(),
    typescript(),
    json(),
    nodeResolve(),
    commonjs({extensions: [".js", ".ts", ".jsx", ".tsx"]})
];

if (process.env.NODE_ENV === "production") {
    defaultPlugins.push(terser());
}

export {defaultPlugins};
