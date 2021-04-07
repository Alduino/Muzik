import {dirname, join} from "path";
import {mkdir} from "fs/promises";
import {log} from "./logger";
import AlbumTable, {Album as DbAlbum} from "./table/albumTable";
import SongTable, {Song as DbSong} from "./table/songTable";
import ArtistTable, {Artist} from "./table/artistTable";
import {Predicates} from "./jsondb";

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

        const albums = await this.albums.getAll();
        return this.wrapAlbums(albums);
    }

    async getAllSongs(): Promise<Song[]> {
        this.checkInitialised();

        const songs = await this.songs.getAll();
        return this.wrapSongs(songs);
    }

    getMatchingArtists(predicates: Predicates<Artist>): Promise<Artist[]> {
        this.checkInitialised();

        return this.artists.getMatching(predicates);
    }

    async getMatchingAlbums(predicates: Predicates<DbAlbum>): Promise<Album[]> {
        this.checkInitialised();

        const albums = await this.albums.getMatching(predicates);
        return this.wrapAlbums(albums);
    }

    async getMatchingSongs(predicates: Predicates<DbSong>): Promise<Song[]> {
        this.checkInitialised();

        const songs = await this.songs.getMatching(predicates);
        return this.wrapSongs(songs);
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

    private async wrapAlbums(albums: DbAlbum[]): Promise<Album[]> {
        const artistCache = new Map<number, Artist>();
        const result = new Array(albums.length);

        for (let i = 0; i < albums.length; i++) {
            const album = albums[i];

            if (!artistCache.has(album.artistId)) {
                const artist = await this.getArtist(album.artistId);
                if (artist === null)
                    throw new Error(
                        `Album ${album.id}'s artist ${album.artistId} does not exist`
                    );
                artistCache.set(album.artistId, artist);
            }

            const artist = artistCache.get(album.artistId) as Artist;

            result[i] = {...album, artist};
        }

        return result;
    }

    private async wrapSongs(songs: DbSong[]): Promise<Song[]> {
        const albumCache = new Map<number, Album>();
        const result = new Array(songs.length);

        for (let i = 0; i < songs.length; i++) {
            const song = songs[i];

            if (!albumCache.has(song.albumId)) {
                const album = await this.getAlbum(song.albumId);
                if (album === null)
                    throw new Error(
                        `Song ${song.id}'s album ${song.albumId} does not exist`
                    );
                albumCache.set(song.albumId, album);
            }

            const album = albumCache.get(song.albumId) as Artist;

            result[i] = {...song, album};
        }

        return result;
    }

    private async wrapAlbum(album: DbAlbum): Promise<Album> {
        const artist = await this.getArtist(album.artistId);
        if (artist == null)
            throw new Error(`Artist of album ${album.id} does not exist`);

        return {
            ...album,
            artist
        };
    }

    private async wrapSong(song: DbSong): Promise<Song> {
        const album = await this.getAlbum(song.albumId);
        if (album === null)
            throw new Error(`Album of song ${song.id} does not exist`);

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
