# Muzik

It's a music player. Very early stages currently.

## Building locally

It's pretty messy at the moment because everything keeps breaking. Here's steps that work for me (note I'm on Linux).

0. Install rust (https://rustup.rs) and the [`rsw`](https://crates.io/crates/rsw) and [`wasm-pack`](https://crates.io/crates/wasm-pack) crates (which are used for compiling some wasm tools).
   Also you’ll need to enable [nodejs corepack](https://nodejs.org/api/corepack.html), if you have node installed just run `corepack enable`.
1. In the root of the repository run `pnpm install`. It might take a sec because it has to compile some native dependencies.
2. Now you can run `rsw build` (in the root still), which will compile release versions of any custom rust libs. I’d recommend against compiling dev versions because they are *much* slower, especially when you are importing your music.
   I’d rather use proper native dependencies but I couldn’t get it to work, if anyone has ideas I’m open.
3. Still in the root, run `pnpm recursive run build`. Once this gets to building the app itself you can cancel it, the app fails to properly build at the moment.
4. To run the app in dev mode, run `pnpm dev` in `apps/desktop2`. It’ll do HMR and restarting etc automatically.
