use std::io::Cursor;
use blockhash::Image;

use image::imageops::FilterType;
use image::io::Reader;
use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
pub struct Result {
    pub red: u8,
    pub green: u8,
    pub blue: u8,
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen(js_name = getImageAverageColour)]
pub fn get_image_average_colour(buffer: &[u8]) -> Result {
    let img_reader = Reader::new(Cursor::new(buffer))
        .with_guessed_format().unwrap();

    let decoded_img = img_reader.decode().unwrap();
    let small_img = decoded_img.resize_exact(1, 1, FilterType::Lanczos3);

    let pixel = small_img.get_pixel(0, 0).0;

    Result {
        red: pixel[0],
        green: pixel[1],
        blue: pixel[2],
    }
}
