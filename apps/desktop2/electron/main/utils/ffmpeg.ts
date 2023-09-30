import {join} from "path";
import {app} from "electron";
import {execa} from "execa";
import {
    Component,
    detectPlatform,
    downloadBinaries,
    DownloadResult,
    getBinaryFilename,
    locateBinariesSync
} from "ffbinaries";
import {configDb} from "./config.ts";
import {log} from "./logger.ts";

async function findOrDownload(component: Component) {
    const {[component]: locatedFfmpeg} = locateBinariesSync([component], {
        ensureExecutable: true
    });

    if (locatedFfmpeg.found) {
        log.debug({path: locatedFfmpeg.path}, "Found %s", component);
        return locatedFfmpeg.path;
    }

    const platform = detectPlatform();
    if (!platform) throw new Error("Unsupported platform");

    log.debug("Did not find %s, will download for %s", component, platform);

    const destination = join(app.getPath("userData"), "ffbinaries");

    await new Promise<DownloadResult[]>((resolve, reject) => {
        downloadBinaries(
            [component],
            {
                destination,
                platform
            },
            (err, results) => {
                if (err) return reject(err);
                resolve(results);
            }
        );
    });

    const path = join(destination, getBinaryFilename("ffmpeg", platform));

    log.debug({path}, "Downloaded %s", component);

    return path;
}

export async function initialiseFfmpeg() {
    const [mpeg, probe] = await Promise.all([
        findOrDownload("ffmpeg"),
        findOrDownload("ffprobe")
    ]);

    configDb.data.ffPaths = {
        mpeg,
        probe
    };

    await configDb.write();
}

class FfConfigBuilder {
    #args: string[] = [];

    add(key: string, value?: string) {
        if (value) {
            this.#args.push(`-${key}`, value);
        } else {
            this.#args.push(`-${key}`);
        }

        return this;
    }

    addRaw(arg: string) {
        this.#args.push(arg);
        return this;
    }

    build() {
        return this.#args;
    }
}

export function ffargs() {
    return new FfConfigBuilder();
}

interface Options {
    pipe?: boolean;
}

export function runFfmpeg(
    component: "mpeg" | "probe",
    args: string[] | FfConfigBuilder,
    options: Options = {}
) {
    const ffPaths = configDb.data.ffPaths;
    if (!ffPaths) throw new Error("ffmpeg not initialised");

    if (args instanceof FfConfigBuilder) {
        args = args.build();
    }

    const file = ffPaths[component];

    log.debug({file, args}, "Running %s", component);

    return execa(file, args, {
        stderr: process.env.NODE_ENV === "production" ? "ignore" : "inherit",
        stdin: "pipe",
        stdout: "pipe",
        buffer: !options.pipe
    });
}
