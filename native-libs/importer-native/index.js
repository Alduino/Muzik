import {initSync} from "./pkg";
import wasmDataUri from "./pkg/importer_native_bg.wasm?url";

const buffer = Buffer.from(wasmDataUri.split(",")[1], "base64");
initSync(buffer.buffer);

export * from "./pkg";
