declare module "ffbinaries" {
    export type Platform =
        | "windows-32"
        | "win"
        | "windows"
        | "win-32"
        | "windows-64"
        | "win-64"
        | "linux-32"
        | "linux"
        | "linux-64"
        | "linux-armhf"
        | "linux-arm"
        | "linux-armel"
        | "osx-64"
        | "mac"
        | "osx"
        | "mac-64";

    export type Component = "ffmpeg" | "ffprobe" | "ffserver" | "ffplay";

    export interface DownloadOptions {
        destination?: string;
        version?: string;
        force?: boolean;
        quiet?: boolean;
        tickerFn?: (percent: number) => void;
        tickerInterval?: number;
        platform?: Platform;
    }

    function downloadBinaries(
        components?: Component | Component[],
        opts?: DownloadOptions,
        callback: () => void
    );

    export interface LocateOptions {
        paths?: string;
        ensureExecutable?: string[];
    }

    export interface LocateResult {
        [component: Component]: {
            found: boolean;
            isExecutable: boolean;
            path: string;
            version: string | "error" | null;
        };
    }

    function locateBinariesSync(
        components: Component | Component[],
        opts?: LocateOptions
    ): LocateResult;

    export {downloadBinaries, locateBinariesSync};
}
