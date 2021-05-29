import {parseFile} from "./parse";

console.log("testing...");

(async () => {
    console.log(await parseFile("test.m3u8"));
})();
