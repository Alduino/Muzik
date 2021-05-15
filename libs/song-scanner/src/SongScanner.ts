import Emittery from "emittery";
import Database, {Album, AlbumArt, Artist, Track} from "@muzik/database";
import {
    IAudioMetadata,
    parseFile as getFileMetadata,
    selectCover
} from "music-metadata";
import {fromFile as getFileMime} from "file-type";
import {basename, dirname, join, resolve} from "path";
import {readdir, readFile, stat} from "fs/promises";
import {readdirIterator} from "readdir-enhanced";
import {normalizeSync as normalise} from "normalize-diacritics";
import {createHash} from "crypto";
import {watch} from "chokidar";
import {log} from "./logger";

type SearchName = string | ((v: string) => boolean);

interface MetadataAlbumArt {
    data: Buffer;
    format: string;
}

interface SongScannerCallbacks {
    supportsMimeType(type: string): Promise<boolean>;

    getAverageColour(mime: string, buffer: Uint8Array): Promise<string>;
}

const MIME_MAPPING: Record<string, string> = {
    "audio/x-flac": "audio/flac"
};

export default class SongScanner extends Emittery {
    private listenedDirectories = new Set<string>();

    constructor(
        private readonly db: Database,
        private readonly callbacks: SongScannerCallbacks,
        private readonly triggerDelay = 1000
    ) {
        super();
    }

    private static async findAlbumArt(dir: string, searchNames: SearchName[]) {
        const files = await readdir(dir);

        for (const file of files) {
            const fullPath = resolve(dir, file);
            const fileStat = await stat(fullPath);
            if (!fileStat.isFile()) continue;

            const {mime} = (await getFileMime(fullPath)) || {
                mime: "unknown"
            };
            if (!mime.startsWith("image/")) continue;

            const baseName = this.normaliseName(
                basename(file).replace(/\..+$/, "")
            );

            for (const searchName of searchNames) {
                const match =
                    typeof searchName === "string"
                        ? baseName === this.normaliseName(searchName)
                        : searchName(baseName);

                if (match) return join(dir, file);
            }
        }
    }

    private static async getSearchPaths(
        path: string,
        metadata: IAudioMetadata
    ) {
        const names: (SearchName | undefined)[] = [
            basename(path).replace(/\..+$/, ""),
            metadata.common.title,
            metadata.common.album,
            metadata.common.artist,
            v => v.includes("ART")
        ];

        return names.filter(v => v) as SearchName[];
    }

    private static async readAlbumArt(
        path: string | undefined
    ): Promise<MetadataAlbumArt | undefined> {
        if (!path) return undefined;
        const {mime} = (await getFileMime(path)) || {mime: "unknown"};
        const data = await readFile(path);

        return {
            format: mime,
            data
        };
    }

    private static async loadAlbumArt(path: string, metadata: IAudioMetadata) {
        return await this.readAlbumArt(
            await this.findAlbumArt(
                dirname(path),
                await this.getSearchPaths(path, metadata)
            )
        );
    }

    private static throwTrackError(path: string, message: string): never {
        throw new Error(`${message}; at ${path}`);
    }

    private static normaliseName(name: string) {
        name = name.toUpperCase();
        name = normalise(name);
        name = name.replace(/['’]/g, "");
        name = name.replace(/\W+/g, " ");
        name = name.trim();
        return name;
    }

    private static hashBuffer(data: Buffer) {
        return createHash("sha256").update(data).digest("hex");
    }

    // note: does not sync, run fullSync after.
    addDirectory(dir: string): void {
        this.listenedDirectories.add(dir);
    }

    async fullSync(progressCb?: (percent: number) => void): Promise<void> {
        const musicFiles = new Set<string>();

        const files = await this.readDirectories();
        const totalFiles = files.size;

        await this.db.inTransaction(async () => {
            let i = 0;
            for (const [path, lastUpdated] of files) {
                const didInsert = await this.updateTrack(path, lastUpdated);
                if (didInsert) musicFiles.add(path);
                progressCb?.((i++ / totalFiles) * 100);
            }
        });

        await this.deleteTracksNotIn(musicFiles);
        await this.deleteOrphans();
        await this.db.vacuum();
    }

    beginWatching(): void {
        const watcher = watch(Array.from(this.listenedDirectories), {
            ignoreInitial: true,
            atomic: this.triggerDelay
        });

        watcher.on("add", path => this.handleFileChanged(path));
        watcher.on("change", path => this.handleFileChanged(path));
        watcher.on("unlink", path => this.handleFileDeleted(path));
    }

    private async getMetadata(
        path: string
    ): Promise<{
        track: Track;
        albumArt?: AlbumArt;
        album: Album;
        artist: Artist;
    }> {
        const metadata = await getFileMetadata(path, {duration: true});
        const albumArt: MetadataAlbumArt | undefined =
            selectCover(metadata.common.picture) ||
            (await SongScanner.loadAlbumArt(path, metadata));
        const albumArtHash = albumArt && SongScanner.hashBuffer(albumArt.data);
        const albumArtAvgColour =
            albumArt &&
            (await this.callbacks.getAverageColour(
                albumArt.format,
                albumArt.data
            ));

        const trackName = metadata.common.title;
        if (!trackName)
            SongScanner.throwTrackError(path, "Track does not have a title");
        const trackNameSortable =
            metadata.common.titlesort || SongScanner.normaliseName(trackName);

        const albumName = metadata.common.album;
        if (!albumName)
            SongScanner.throwTrackError(path, "Track does not have an album");
        const albumNameSortable =
            metadata.common.albumsort || SongScanner.normaliseName(albumName);

        const artistName = metadata.common.artist;
        if (!artistName)
            SongScanner.throwTrackError(path, "Track does not have an artist");
        const artistNameSortable =
            metadata.common.artistsort || SongScanner.normaliseName(artistName);

        const releaseDateUnix = metadata.common.date
            ? Date.parse(metadata.common.date)
            : null;

        const releaseDate =
            releaseDateUnix && !Number.isNaN(releaseDateUnix)
                ? new Date(releaseDateUnix)
                : null;

        const duration = metadata.format.duration;
        if (!duration)
            SongScanner.throwTrackError(path, "Track does not have a duration");

        const trackNo = metadata.common.track.no;

        return {
            track: {
                name: trackName,
                sortableName: trackNameSortable,
                releaseDate,
                duration,
                trackNo,
                audioSrcPath: path
            },
            albumArt: albumArt && {
                source: albumArt.data,
                mimeType: albumArt.format,
                avgColour: albumArtAvgColour as string,
                hash: albumArtHash as string
            },
            album: {
                name: albumName,
                sortableName: albumNameSortable
            },
            artist: {
                name: artistName,
                sortableName: artistNameSortable
            }
        };
    }

    private async handleFileChanged(path: string) {
        const {mtimeMs: lastUpdated} = await stat(path);
        await this.updateTrack(path, lastUpdated);
    }

    private async handleFileDeleted(path: string) {
        await this.db.deleteTrackByPath(path);
        await this.deleteOrphans();
    }

    private async readDirectories(): Promise<Map<string, number>> {
        const result = new Map<string, number>();

        for (const dir of this.listenedDirectories) {
            const files = readdirIterator(dir, {deep: true, stats: true});

            for await (const file of files) {
                if (!file.isFile()) continue;
                result.set(resolve(dir, file.path), file.mtimeMs);
            }
        }

        return result;
    }

    private async writeNewTrack(path: string, lastUpdated: number) {
        const metadata = await this.getMetadata(path).catch(() => null);

        if (metadata === null) {
            return false;
        }

        const {track, albumArt, album, artist} = metadata;

        if (albumArt) await this.db.createOrIgnoreAlbumArt(albumArt);

        const artistId = await this.db.createOrUpdateArtist({
            ...artist,
            lastUpdated
        });

        const albumId = await this.db.createOrUpdateAlbum({
            ...album,
            artistId,
            lastUpdated
        });

        await this.db.createOrUpdateTrack({
            ...track,
            albumId,
            albumArtHash: albumArt?.hash ?? null,
            lastUpdated
        });

        return true;
    }

    private async deleteOrphans() {
        log.debug("Deleting orphans");
        await this.db.deleteOrphanAlbums();
        await this.db.deleteOrphanArtists();
        await this.db.deleteOrphanAlbumArt();
    }

    private async updateTrack(path: string, lastUpdated: number) {
        const {mime} = (await getFileMime(path)) ?? {mime: "unknown"};
        const mappedMime = MIME_MAPPING[mime] ?? mime;

        if (!(await this.callbacks.supportsMimeType(mappedMime))) {
            log.trace(
                "Skipping file at `%s` as its mime type (%s) is not supported",
                path,
                mappedMime
            );
            return false;
        }

        const updated = await this.db.getLastUpdatedByPath(path);
        const requiresUpdate = !updated || updated < lastUpdated;

        if (!requiresUpdate) {
            log.trace("Skipping file at `%s` as it has not been updated", path);
            return true;
        }

        log.trace("Importing track from `%s`", path);
        return this.writeNewTrack(path, lastUpdated);
    }

    private async deleteTracksNotIn(musicFiles: Set<string>) {
        log.debug("Deleting non-existent songs");
        await this.db.deleteTracksNotIn(musicFiles);
    }
}
