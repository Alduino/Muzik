use std::error::Error;
use std::io::Cursor;

use blockhash::blockhash64;
use image::ImageFormat;
use image::io::Reader;
use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

fn image_format_from_mime(mime_type: &str) -> Option<ImageFormat> {
    match mime_type {
        "image/png" => Some(ImageFormat::Png),
        "image/jpeg" => Some(ImageFormat::Jpeg),
        "image/gif" => Some(ImageFormat::Gif),
        "image/webp" => Some(ImageFormat::WebP),
        "image/tiff" => Some(ImageFormat::Tiff),
        "image/bmp" => Some(ImageFormat::Bmp),
        "image/x-icon" => Some(ImageFormat::Ico),
        "image/avif" => Some(ImageFormat::Avif),
        _ => None,
    }
}

fn run_phash(image_buff: &[u8], mime_type: &str) -> Result<String, Box<dyn Error>> {
    let mut img_reader = Reader::new(Cursor::new(image_buff));
    let format = image_format_from_mime(mime_type).ok_or("Invalid mime type")?;
    img_reader.set_format(format);

    let decoded_img = img_reader.decode()?;

    let hash = blockhash64(&decoded_img);
    Ok(hash.to_string())
}

#[wasm_bindgen]
pub fn phash(image_buff: &[u8], mime_type: String) -> Result<String, String> {
    let result = run_phash(image_buff, mime_type.as_str());

    match result {
        Ok(hash) => Ok(hash),
        Err(err) => Err(err.to_string()),
    }
}
