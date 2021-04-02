import {join} from "path";

export function getRootDirectory() {
    switch (process.platform) {
        case "win32": {
            const appData = process.env.APPDATA;
            if (!appData) throw new Error("%APPDATA% is not set");

            return appData;
        }
        case "linux":
            const home = process.env.HOME;
            if (!home) throw new Error("$HOME is not set");

            return join(home, ".config");
        default:
            throw new Error("OS not supported");
    }
}

export function getConfigDirectory(appName: string, root = getRootDirectory()) {
    const validCharactersName = appName
        .replace(/[^a-z0-9\/]+/g, " ")
        .trim()
        .replace(/ /g, "-");
    return join(root, validCharactersName);
}

export function getConfigFile(
    appName: string,
    fileName: string,
    root?: string
) {
    const dir = getConfigDirectory(appName, root);
    return join(dir, fileName);
}

export class Locator {
    constructor(private appName: string, private root = getRootDirectory()) {}

    get dir() {
        return getConfigDirectory(this.appName, this.root);
    }

    getFile(name: string) {
        return getConfigFile(this.appName, name, this.root);
    }
}
