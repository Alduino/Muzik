use wasm_bindgen::prelude::wasm_bindgen;
use xxhash_rust::xxh3::xxh3_64;

#[wasm_bindgen(js_name = getBufferHash)]
pub fn hash_buffer(buffer: &[u8]) -> u32 {
    let full_hash = xxh3_64(buffer);
    (full_hash & 0xFFFFFFFF) as u32
}
