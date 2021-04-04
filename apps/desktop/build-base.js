import babel from "@rollup/plugin-babel";
import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import {terser} from "rollup-plugin-terser";

const defaultPlugins = [
    typescript(),
    nodeResolve(),
    commonjs({extensions: [".js", ".ts", ".jsx", ".tsx"]}),
    babel({
        babelHelpers: "bundled",
        extensions: [".js", ".jsx", ".es6", ".es", ".mjs", ".ts", ".tsx"],
        exclude: "node_modules/*"
    }),
    json()
];

if (process.env.NODE_ENV === "production") {
    defaultPlugins.push(terser());
}

export {defaultPlugins};
