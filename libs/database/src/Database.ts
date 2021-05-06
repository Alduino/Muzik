import knex, {Knex} from "knex";
import MigrationManager from "./migration-manager";
import migrations from "./migrations";
import {join} from "path";
import {DbTrack} from "./tables/Track";
import {DbAlbum} from "./tables/Album";
import {DbArtist} from "./tables/Artist";
import AlbumArt from "./tables/AlbumArt";

type NamesWithSortable<T extends string> = {[key in T]: string} &
    {[key in `${T}Sortable`]: string};

export default class Database {
    private readonly knex: Knex;
    private transaction?: Knex.Transaction;
    private readonly transactionProvider: () => Promise<Knex.Transaction>;

    constructor(dbDir: string) {
        const filePath = join(dbDir, "database.sqlite");

        this.knex = knex({
            client: "sqlite",
            connection: filePath,
            useNullAsDefault: true,
            asyncStackTraces: process.env.NODE_ENV !== "production"
        });

        this.transactionProvider = this.knex.transactionProvider();
    }

    private get q() {
        return this.transaction || this.knex;
    }

    private get tracks() {
        return this.q.table<DbTrack>("tracks");
    }

    private get albumArt() {
        return this.q.table<AlbumArt>("albumArt");
    }

    private get albums() {
        return this.q.table<DbAlbum>("albums");
    }

    private get artists() {
        return this.q.table<DbArtist>("artists");
    }

    async initialise() {
        const migrationManager = new MigrationManager(this.knex, migrations);
        await migrationManager.migrate();
    }

    /**
     * Deletes any songs from the database that are inside `directory`
     * @remarks Uses `like "directory%"` on the audio src path to find songs
     */
    deleteFromDirectory(directory: string): PromiseLike<void> {
        // make sure it ends with a `/`
        if (!directory.endsWith("/")) directory = directory + "/";

        return this.tracks
            .where("audioSrcPath", "like", `${directory}%`)
            .delete();
    }

    deleteTrackByPath(path: string): PromiseLike<void> {
        return this.tracks.where({audioSrcPath: path}).delete();
    }

    deleteTrackById(id: number): PromiseLike<void> {
        return this.tracks.where({id}).delete();
    }

    async createOrUpdateTrack(details: Omit<DbTrack, "id">): Promise<number> {
        await this.tracks.insert(details).onConflict("audioSrcPath").merge();

        return this.tracks
            .where({audioSrcPath: details.audioSrcPath})
            .first()
            .then(res => res?.id as number);
    }

    async createOrUpdateAlbum(details: Omit<DbAlbum, "id">): Promise<number> {
        await this.albums
            .insert(details)
            .onConflict(["sortableName", "artistId"])
            .merge();

        return this.albums
            .where({
                sortableName: details.sortableName,
                artistId: details.artistId
            })
            .first()
            .then(res => res?.id as number);
    }

    async createOrUpdateArtist(details: Omit<DbArtist, "id">): Promise<number> {
        await this.artists.insert(details).onConflict("sortableName").merge();

        return this.artists
            .where({sortableName: details.sortableName})
            .first()
            .then(res => res?.id as number);
    }

    async createOrIgnoreAlbumArt(details: AlbumArt): Promise<void> {
        await this.albumArt.insert(details).onConflict("hash").ignore();
    }

    updateTrackByPath(
        path: string,
        details: Partial<Omit<DbTrack, "id" | "audioSrcPath">>
    ): PromiseLike<void> {
        return this.tracks.where({audioSrcPath: path}).update(details);
    }

    async deleteOrphanAlbumArt(): Promise<void> {
        await this.albumArt
            .whereNotExists(builder =>
                builder
                    .table<DbTrack>("tracks")
                    .whereRaw("tracks.albumArtHash = albumArt.hash")
                    .select("*")
            )
            .delete();
    }

    async deleteOrphanAlbums(): Promise<void> {
        await this.albums
            .whereNotExists(builder =>
                builder
                    .table<DbTrack>("tracks")
                    .whereRaw("tracks.albumId = albums.id")
                    .select("*")
            )
            .delete();
    }

    async deleteOrphanArtists(): Promise<void> {
        await this.artists
            .whereNotExists(builder =>
                builder
                    .table<DbAlbum>("albums")
                    .whereRaw("albums.artistId = artists.id")
                    .select("*")
            )
            .delete();
    }

    deleteTracksNotIn(list: Set<string>): PromiseLike<void> {
        return this.tracks
            .whereNotIn("audioSrcPath", Array.from(list))
            .delete();
    }

    async inTransaction(cb: () => Promise<void>) {
        await this.knex.transaction(async trx => {
            this.transaction = trx;
            try {
                await cb();
            } finally {
                this.transaction = undefined;
            }
        });
    }

    vacuum(): PromiseLike<void> {
        return this.knex.raw("VACUUM");
    }

    getAllAlbums(): PromiseLike<DbAlbum[]> {
        return this.albums
            .join<DbArtist>("artists", "albums.artistId", "=", "artists.id")
            .select("albums.*")
            .orderBy(["artists.sortableName", "albums.sortableName"]);
    }

    getAllArtists(): PromiseLike<DbArtist[]> {
        return this.artists.select("*").orderBy("sortableName");
    }

    getTrackArtHashByAlbumId(albumId: number): PromiseLike<string[]> {
        if (typeof albumId === "undefined")
            throw new Error("albumId must be defined");
        return this.albums
            .join<DbTrack>("tracks", "tracks.albumId", "=", "albums.id")
            .where("albums.id", albumId)
            .select("tracks.albumArtHash")
            .then(res => res.map(item => item.albumArtHash));
    }

    getTracksByAlbumId(albumId: number): PromiseLike<DbTrack[]> {
        if (typeof albumId === "undefined")
            throw new Error("albumId must be defined");
        return this.tracks.where({albumId}).select("*").orderBy("trackNo");
    }

    getAllTracks(): PromiseLike<(DbTrack & Omit<AlbumArt, "source">)[]> {
        return this.tracks
            .join<DbAlbum>("albums", "tracks.albumId", "albums.id")
            .join<DbArtist>("artists", "albums.artistId", "artists.id")
            .join<AlbumArt>("albumArt", "tracks.albumArtHash", "albumArt.hash")
            .orderBy([
                "artists.sortableName",
                "albums.sortableName",
                "tracks.trackNo"
            ])
            .select("tracks.*", "albumArt.hash", "albumArt.mimeType");
    }

    getTrackById(trackId: number): PromiseLike<DbTrack | undefined> {
        if (typeof trackId === "undefined")
            throw new Error("trackId must be defined");
        return this.tracks.where({id: trackId}).select("*").first();
    }

    getNamesByTrackId(
        trackId: number
    ): Promise<NamesWithSortable<"track" | "album" | "artist">> {
        if (typeof trackId === "undefined")
            throw new Error("trackId must be defined");
        return this.tracks
            .join<DbAlbum>("albums", "tracks.albumId", "=", "albums.id")
            .join<DbArtist>("artists", "albums.artistId", "=", "artists.id")
            .where("tracks.id", trackId)
            .select(
                "tracks.name as track",
                "tracks.sortableName as trackSortable",
                "albums.name as album",
                "albums.sortableName as albumSortable",
                "artists.name as artist",
                "artists.sortableName as artistSortable"
            )
            .first();
    }

    getLastUpdatedByPath(path: string): PromiseLike<number | undefined> {
        if (typeof path === "undefined")
            throw new Error("path must be defined");
        return this.tracks
            .where({audioSrcPath: path})
            .select("id", "lastUpdated")
            .first()
            .then(res => res?.lastUpdated);
    }

    getAlbumArtByHash(hash: string): PromiseLike<AlbumArt | undefined> {
        if (typeof hash === "undefined")
            throw new Error("hash must be defined");
        return this.albumArt.where({hash}).select("*").first();
    }

    getAlbumArtInfoByHash(
        hash: string
    ): PromiseLike<Omit<AlbumArt, "source"> | undefined> {
        if (typeof hash === "undefined")
            throw new Error("hash must be defined");
        return this.albumArt.where({hash}).select(["hash", "mimeType"]).first();
    }
}
