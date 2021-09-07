import {resolve} from "path";
import {readFileSync, writeFileSync} from "fs";

const builderUtilFile = resolve("node_modules/.pnpm/builder-util@22.11.7/node_modules/builder-util/out/util.js");
console.log("Replacing app-builder-bin import from builder util");

const src = readFileSync(builderUtilFile, "utf8").split("\n");
src[4] = `const app_builder_bin_1 = require("@alduino/app-builder-bin");`;
writeFileSync(builderUtilFile, src.join("\n"));
