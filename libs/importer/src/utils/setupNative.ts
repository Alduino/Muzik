import {initSync} from "@muzik/importer-native";
// eslint-disable-next-line import/no-unresolved
import wasmDataUri from "@muzik/importer-native/importer_native_bg.wasm?url";

export function setupNative() {
    const wasmB64 = wasmDataUri.replace(/^data:.*?base64,/, "");
    const buffer = Buffer.from(wasmB64, "base64");
    initSync(buffer.buffer);
}
