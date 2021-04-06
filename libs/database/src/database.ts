import {dirname, join} from "path";
import {mkdir} from "fs/promises";
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
        await this.artists.initialise();

        this.initialised = true;
    }

    async wrapAlbum(album: DbAlbum): Promise<Album> {
        const artist = await this.getArtist(album.artistId);
        if (artist == null)
            throw new Error(`Artist of album ${album.id} does not exist`);

        return {
            ...album,
            artist
        };
    }

    async wrapSong(song: DbSong): Promise<Song> {
        const album = await this.getAlbum(song.albumId);
        if (album === null)
            throw new Error(`Album of song ${song.id} does not exist`);

        return {
            ...song,
            album
        };
    }

    getArtist(id: number): Promise<Artist | null> {
        this.checkInitialised();

        return this.artists.get(id);
    }

    async getAlbum(id: number): Promise<Album | null> {
        this.checkInitialised();

        const album = await this.albums.get(id);
        if (album === null) return null;

        return this.wrapAlbum(album);
    }

    async getSong(id: number): Promise<Song | null> {
        this.checkInitialised();

        const song = await this.songs.get(id);
        if (song === null) return null;

        return this.wrapSong(song);
    }

    getAllArtists(): Promise<Artist[]> {
        this.checkInitialised();

        return this.artists.getAll();
    }

    async getAllAlbums(): Promise<Album[]> {
        this.checkInitialised();

        const artistCache = new Map<number, Artist>();
        const albums = await this.albums.getAll();

        const result: Album[] = [];

        for (const album of albums) {
            if (!artistCache.has(album.artistId)) {
                const artist = await this.getArtist(album.artistId);
                if (artist === null)
                    throw new Error(`Artist ${album.artistId} does not exist`);
                artistCache.set(album.artistId, artist);
            }

            const artist = artistCache.get(album.artistId) as Artist;

            result.push({
                ...album,
                artist
            });
        }

        return result;
    }

    async getAllSongs(): Promise<Song[]> {
        this.checkInitialised();

        const albumCache = new Map<number, Album>();
        const songs = await this.songs.getAll();

        const result: Song[] = [];

        for (const song of songs) {
            if (!albumCache.has(song.albumId)) {
                const album = await this.getAlbum(song.albumId);
                if (album === null)
                    throw new Error(`Album ${song.albumId} does not exist`);
                albumCache.set(song.albumId, album);
            }

            const album = albumCache.get(song.albumId) as Album;

            result.push({
                ...song,
                album
            });
        }

        return result;
    }

    addArtist(name: string): Promise<Artist> {
        return this.artists.add(name);
    }

    addAlbum(
        name: string,
        artPath: string | null,
        artistId: number
    ): Promise<Album> {
        return this.albums
            .add(name, artPath, artistId)
            .then(album => this.wrapAlbum(album));
    }

    addSong(
        song: Omit<DbSong, "id" | "albumId">,
        albumId: number
    ): Promise<Song> {
        return this.songs.add(song, albumId).then(song => this.wrapSong(song));
    }

    hasArtist(name: string): Promise<boolean> {
        return this.artists.hasNamed(name);
    }

    hasAlbum(name: string, artistId: number): Promise<boolean> {
        return this.albums.hasNamed(name, artistId);
    }

    hasSong(name: string, albumId: number): Promise<boolean> {
        return this.songs.hasNamed(name, albumId);
    }

    getArtistId(name: string): number {
        return this.artists.getId(name);
    }

    getAlbumId(name: string, artistId: number): number {
        return this.albums.getId(name, artistId);
    }

    getSongId(name: string, albumId: number): number {
        return this.songs.getId(name, albumId);
    }

    private checkInitialised(): void {
        if (!this.initialised) {
            throw new Error("Database is not initialised");
        }
    }
}
