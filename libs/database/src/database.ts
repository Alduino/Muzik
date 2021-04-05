import {dirname, join} from "path";
import {mkdir} from "fs/promises";
import {configLocator} from "./config-locator";
import {log} from "./logger";
import AlbumTable, {Album as DbAlbum} from "./table/albumTable";
import SongTable, {Song as DbSong} from "./table/songTable";
import ArtistTable, {Artist} from "./table/artistTable";

export interface Album extends DbAlbum {
    artist: Artist;
}

export interface Song extends DbSong {
    album: Album;
}

export class Database {
    public static defaultLocation = configLocator.dir;
    private initialised = false;
    private artists = new ArtistTable(join(this.root, "artists"));
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

    getArtist(id: number): Promise<Artist | null> {
        this.checkInitialised();

        return this.artists.get(id);
    }

    async getAlbum(id: number): Promise<Album | null> {
        this.checkInitialised();

        const album = await this.albums.get(id);
        if (album === null) return null;

        const artist = await this.getArtist(id);
        if (artist == null)
            throw new Error(`Artist of album ${id} does not exist`);

        return {
            ...album,
            artist
        };
    }

    async getSong(id: number): Promise<Song | null> {
        this.checkInitialised();

        const song = await this.songs.get(id);
        if (song === null) return null;

        const album = await this.getAlbum(song.albumId);
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
