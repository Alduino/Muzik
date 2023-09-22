import {resolve} from "path";
import {importTracks} from "@muzik/importer";

const {dirs, out} = JSON.parse(process.argv[2]);

console.log("Importing tracks");
const {promise} = importTracks({
    directories: dirs,
    dbPath: resolve(out)
});

const result = await promise;

console.log("Done!", result);
