import {dirname, join} from "path";
import {mkdir} from "fs/promises";
import {configLocator} from "./config-locator";
import {log} from "./logger";
import AlbumTable, {Album} from "./table/albumTable";
import SongTable, {Song as DbSong} from "./table/songTable";

export interface Song extends DbSong {
    album: Album;
}

export class Database {
    public static defaultLocation = configLocator.dir;
    private initialised = false;
    private albums = new AlbumTable(join(this.root, "albums"));
    private songs = new SongTable(join(this.root, "songs"));

    private constructor(private readonly root: string) {}

    public static async create(path: string): Promise<Database> {
        log.debug("Loading database at %s", path);
        await mkdir(dirname(path), {recursive: true});

        log.trace("Creating database");
        return new Database(path);
    }

    async initialise(): Promise<void> {
        if (this.initialised) {
            throw new Error("Database is already initialised");
        }

        log.debug("Initialising the database");
        await this.songs.initialise();
        await this.albums.initialise();
    }

    getAlbum(id: number): Promise<Album | null> {
        return this.albums.get(id);
    }

    async getSong(id: number): Promise<Song | null> {
        const song = await this.songs.get(id);
        if (song === null) return null;

        const album = await this.albums.get(song.albumId);
        if (album === null)
            throw new Error(`Album of song ${id} does not exist`);

        return {
            ...song,
            album
        };
    }

    private checkInitialised(): void {
        if (!this.initialised) {
            throw new Error("Database is not initialised");
        }
    }
}
