import {join} from "path";
import Sqlite3Db, {Database as Sqlite3} from "better-sqlite3";
import MigrationManager from "./migration-manager";
import migrations from "./migrations";
import {DbAlbum} from "./tables/Album";
import AlbumArt from "./tables/AlbumArt";
import {DbArtist} from "./tables/Artist";
import {DbTrack} from "./tables/Track";

type NamesWithSortable<T extends string> = {[key in T]: string} &
    {[key in `${T}Sortable`]: string};

const TABLE_TRACKS = "tracks";
const TABLE_ALBUM_ART = "albumArt";
const TABLE_ALBUMS = "albums";
const TABLE_ARTISTS = "artists";

type NoId<T> = Omit<T, "id">;

class DeleteTracksNotInStatements {
    readonly deleteTracksNotIn_deleteTempTable = this.db.prepare(
        `DROP TABLE possiblePathsTemp`
    );
    readonly deleteTracksNotIn_insertToTempTable = this.db.prepare<string>(
        `INSERT INTO possiblePathsTemp (path) VALUES (?)`
    );
    readonly deleteTracksNotIn = this.db.prepare(`
        DELETE FROM ${TABLE_TRACKS}
        WHERE audioSrcPath NOT IN (SELECT path FROM possiblePathsTemp)
    `);

    constructor(private db: Sqlite3) {}
}

class GetFirstArtistLettersStatements {
    readonly deleteTempTable = this.db.prepare(
        `DROP TABLE firstSongLettersTemp`
    );

    readonly insertToTempTable = this.db.prepare<number>(
        `INSERT INTO firstSongLettersTemp (id) VALUES (?)`
    );
    readonly getByTrackId = this.db.prepare(`
        SELECT SUBSTRING(ar.sortableName, 1, 1) AS firstLetter
        FROM ${TABLE_TRACKS} tr
        INNER JOIN ${TABLE_ALBUMS} al ON tr.albumId = al.id
        INNER JOIN ${TABLE_ARTISTS} ar ON al.artistId = ar.id
        WHERE tr.id IN (SELECT id FROM firstSongLettersTemp)
        ORDER BY ar.sortableName
    `);

    constructor(private db: Sqlite3) {}
}

class Statements {
    readonly deleteTracksWhereAudioSrcPathLike = this.db.prepare<string>(
        `DELETE FROM ${TABLE_TRACKS} WHERE audioSrcPath LIKE ?`
    );
    readonly deleteTrackWhereAudioSrcPathEq = this.db.prepare<string>(
        `DELETE FROM ${TABLE_TRACKS} WHERE audioSrcPath = ?`
    );
    readonly deleteTrackById = this.db.prepare<number>(
        `DELETE FROM ${TABLE_TRACKS} WHERE id = ?`
    );
    readonly upsertTrack = this.db.prepare<
        Omit<DbTrack, "id" | "releaseDate"> & {releaseDate?: number}
    >(`
        INSERT INTO ${TABLE_TRACKS} (
            lastUpdated, albumId, albumArtHash, name, sortableName,
            releaseDate, duration, trackNo, audioSrcPath
        ) VALUES (
            @lastUpdated, @albumId, @albumArtHash, @name, @sortableName,
            @releaseDate, @duration, @trackNo, @audioSrcPath
        ) ON CONFLICT(audioSrcPath) DO UPDATE SET
            lastUpdated = excluded.lastUpdated,
            albumId = excluded.albumId,
            albumArtHash = excluded.albumArtHash,
            name = excluded.name,
            sortableName = excluded.sortableName,
            releaseDate = excluded.releaseDate,
            duration = excluded.duration,
            trackNo = excluded.trackNo
    `);
    readonly getTrackIdByPath = this.db.prepare<string>(
        `SELECT id FROM ${TABLE_TRACKS} WHERE audioSrcPath = ?`
    );
    readonly upsertAlbum = this.db.prepare<NoId<DbAlbum>>(`
        INSERT INTO ${TABLE_ALBUMS} (
            lastUpdated, artistId, name, sortableName
        ) VALUES (
            @lastUpdated, @artistId, @name, @sortableName
        ) ON CONFLICT(sortableName, artistId) DO UPDATE SET
            lastUpdated = excluded.lastUpdated,
            name = excluded.name
    `);
    readonly getAlbumIdBySortableNameAndArtistId = this.db.prepare<
        Pick<DbAlbum, "sortableName" | "artistId">
    >(
        `SELECT id FROM ${TABLE_ALBUMS} WHERE sortableName = @sortableName AND artistId = @artistId`
    );
    readonly upsertArtist = this.db.prepare<NoId<DbArtist>>(`
        INSERT INTO ${TABLE_ARTISTS} (
            lastUpdated, name, sortableName
        ) VALUES (
            @lastUpdated, @name, @sortableName
        ) ON CONFLICT(sortableName) DO UPDATE SET
            lastUpdated = excluded.lastUpdated,
            name = excluded.name
    `);
    readonly getArtistIdBySortableName = this.db.prepare<string>(
        `SELECT id FROM ${TABLE_ARTISTS} WHERE sortableName = ?`
    );
    readonly upsertAlbumArt = this.db.prepare<AlbumArt>(`
        INSERT INTO ${TABLE_ALBUM_ART} (
            hash, mimeType, avgColour, source
        ) VALUES (
            @hash, @mimeType, @avgColour, @source
        ) ON CONFLICT DO NOTHING
    `);
    readonly deleteUnusedAlbumArt = this.db.prepare(`
        DELETE FROM ${TABLE_ALBUM_ART}
        WHERE NOT EXISTS (
            SELECT albumArtHash FROM ${TABLE_TRACKS}
            WHERE ${TABLE_TRACKS}.albumArtHash = ${TABLE_ALBUM_ART}.hash
        )
    `);
    readonly deleteUnusedAlbums = this.db.prepare(`
        DELETE FROM ${TABLE_ALBUMS}
        WHERE NOT EXISTS (
            SELECT albumId FROM ${TABLE_TRACKS}
            WHERE ${TABLE_TRACKS}.albumId = ${TABLE_ALBUMS}.id
        )
    `);
    readonly deleteUnusedArtists = this.db.prepare(`
        DELETE FROM ${TABLE_ARTISTS}
        WHERE NOT EXISTS (
            SELECT artistId FROM ${TABLE_ALBUMS}
            WHERE ${TABLE_ALBUMS}.artistId = ${TABLE_ARTISTS}.id
        )
    `);
    readonly deleteTracksNotIn_createTempTable = this.db.prepare(`
        CREATE TEMPORARY TABLE possiblePathsTemp (
            path TEXT
        )
    `);
    readonly getAllAlbums = this.db.prepare(`
        SELECT al.id FROM ${TABLE_ALBUMS} al
        INNER JOIN ${TABLE_ARTISTS} ar ON al.artistId = ar.id
        ORDER BY ar.sortableName, al.sortableName
    `);
    readonly getAllArtists = this.db.prepare(`
        SELECT * FROM ${TABLE_ARTISTS}
        ORDER BY sortableName
    `);
    readonly getArtistById = this.db.prepare<number>(`
        SELECT * FROM ${TABLE_ARTISTS}
        WHERE id = ?
    `);
    readonly getAlbumById = this.db.prepare<number>(`
        SELECT * FROM ${TABLE_ALBUMS}
        WHERE id = ?
    `);
    readonly getTrackArtHashByAlbumId = this.db.prepare<number>(`
        SELECT tr.albumArtHash FROM ${TABLE_ALBUMS} al
        INNER JOIN ${TABLE_TRACKS} tr ON tr.albumId = al.id
        WHERE al.id = ?
    `);
    readonly getTracksByAlbumId = this.db.prepare<number>(`
        SELECT id FROM ${TABLE_TRACKS}
        WHERE albumId = ?
        ORDER BY trackNo
    `);
    readonly getAllTrackIds = this.db.prepare(`
        SELECT tr.id FROM ${TABLE_TRACKS} tr
        INNER JOIN ${TABLE_ALBUMS} al ON tr.albumId = al.id
        INNER JOIN ${TABLE_ARTISTS} ar ON al.artistId = ar.id
        INNER JOIN ${TABLE_ALBUM_ART} aa ON tr.albumArtHash = aa.hash
        ORDER BY ar.sortableName, al.sortableName, tr.trackNo
    `);
    readonly getAllExtendedTracks = this.db.prepare(`
        SELECT tr.*, aa.hash, aa.mimeType
        FROM ${TABLE_TRACKS} tr
        INNER JOIN ${TABLE_ALBUMS} al ON tr.albumId = al.id
        INNER JOIN ${TABLE_ARTISTS} ar ON al.artistId = ar.id
        INNER JOIN ${TABLE_ALBUM_ART} aa ON tr.albumArtHash = aa.hash
        ORDER BY ar.sortableName, al.sortableName, tr.trackNo
    `);
    readonly getTrackById = this.db.prepare<number>(`
        SELECT * FROM ${TABLE_TRACKS}
        WHERE id = ?
        LIMIT 1
    `);
    readonly getNamesByTrackId = this.db.prepare<number>(`
        SELECT
            tr.name as track,
            tr.sortableName as trackSortable,
            al.name as album,
            al.sortableName as albumSortable,
            ar.name as artist,
            ar.sortableName as artistSortable
        FROM ${TABLE_TRACKS} tr
        INNER JOIN ${TABLE_ALBUMS} al ON tr.albumId = al.id
        INNER JOIN ${TABLE_ARTISTS} ar ON al.artistId = ar.id
        WHERE tr.id = ?
        LIMIT 1
    `);
    readonly getTrackLastUpdatedByPath = this.db.prepare<string>(`
        SELECT lastUpdated FROM ${TABLE_TRACKS}
        WHERE audioSrcPath = ?
        LIMIT 1
    `);
    readonly getAlbumArtByHash = this.db.prepare<string>(`
        SELECT * FROM ${TABLE_ALBUM_ART}
        WHERE hash = ?
        LIMIT 1
    `);
    readonly getAlbumArtInfoByHash = this.db.prepare<string>(`
        SELECT hash, mimeType, avgColour FROM ${TABLE_ALBUM_ART}
        WHERE hash = ?
        LIMIT 1
    `);
    readonly getFirstSongLetters_createTempTable = this.db.prepare(`
        CREATE TEMPORARY TABLE firstSongLettersTemp (
            id INTEGER
        )
    `);
    readonly vacuum = this.db.prepare("VACUUM");
    readonly beginTransaction = this.db.prepare("BEGIN");
    readonly commitTransaction = this.db.prepare("COMMIT");

    constructor(private db: Sqlite3) {}
}

export default class Database {
    private readonly db: Sqlite3;
    private sVal: Statements | null = null;

    constructor(dbDir: string) {
        const filePath = join(dbDir, "database.sqlite");
        this.db = new Sqlite3Db(filePath);
    }

    private get s() {
        if (this.sVal === null) throw new Error("Database is not initialised");
        return this.sVal;
    }

    initialise(): void {
        const migrationManager = new MigrationManager(this.db, migrations);
        migrationManager.migrate();
        this.sVal = new Statements(this.db);
    }

    /**
     * Deletes any songs from the database that are inside `directory`
     * @remarks Uses `like "directory%"` on the audio src path to find songs
     */
    deleteFromDirectory(directory: string): void {
        // make sure it ends with a `/`
        if (!directory.endsWith("/")) directory = directory + "/";

        this.s.deleteTracksWhereAudioSrcPathLike.run(`${directory}%`);
    }

    deleteTrackByPath(path: string): void {
        this.s.deleteTrackWhereAudioSrcPathEq.run(path);
    }

    deleteTrackById(id: number): void {
        this.s.deleteTrackById.run(id);
    }

    createOrUpdateTrack(details: NoId<DbTrack>): number {
        const dateValue = details.releaseDate?.getTime();
        this.s.upsertTrack.run({...details, releaseDate: dateValue});
        return this.s.getTrackIdByPath.get(details.audioSrcPath)?.id;
    }

    createOrUpdateAlbum(details: NoId<DbAlbum>): number {
        this.s.upsertAlbum.run(details);
        return this.s.getAlbumIdBySortableNameAndArtistId.get({
            sortableName: details.sortableName,
            artistId: details.artistId
        })?.id;
    }

    createOrUpdateArtist(details: NoId<DbArtist>): number {
        this.s.upsertArtist.run(details);
        return this.s.getArtistIdBySortableName.get(details.sortableName)?.id;
    }

    createOrIgnoreAlbumArt(details: AlbumArt): void {
        this.s.upsertAlbumArt.run(details);
    }

    deleteOrphanAlbumArt(): void {
        this.s.deleteUnusedAlbumArt.run();
    }

    deleteOrphanAlbums(): void {
        this.s.deleteUnusedAlbums.run();
    }

    deleteOrphanArtists(): void {
        this.s.deleteUnusedArtists.run();
    }

    deleteTracksNotIn(list: Set<string>): void {
        this.s.deleteTracksNotIn_createTempTable.run();
        // needs to be constructed separately so temp table exists when statements are prepared
        const s = new DeleteTracksNotInStatements(this.db);
        for (const item of list)
            s.deleteTracksNotIn_insertToTempTable.run(item);
        s.deleteTracksNotIn.run();
        s.deleteTracksNotIn_deleteTempTable.run();
    }

    getAllAlbums(): number[] {
        return this.s.getAllAlbums.all().map(album => (album as DbAlbum).id);
    }

    getAllArtists(): DbArtist[] {
        return this.s.getAllArtists.all();
    }

    getArtistById(artistId: number): DbArtist {
        return this.s.getArtistById.get(artistId);
    }

    getAlbumById(albumId: number): DbAlbum {
        return this.s.getAlbumById.get(albumId);
    }

    getTrackArtHashByAlbumId(albumId: number): string[] {
        if (typeof albumId === "undefined")
            throw new Error("albumId must be defined");
        return this.s.getTrackArtHashByAlbumId
            .all(albumId)
            .map(res => res.albumArtHash);
    }

    getTracksByAlbumId(albumId: number): number[] {
        if (typeof albumId === "undefined")
            throw new Error("albumId must be defined");
        return this.s.getTracksByAlbumId.all(albumId).map(v => v.id);
    }

    getAllTracks(): (DbTrack & Omit<AlbumArt, "source">)[] {
        return this.s.getAllExtendedTracks.all();
    }

    getAllTrackIds(): number[] {
        return this.s.getAllTrackIds.all().map(v => v.id);
    }

    getTrackById(trackId: number): DbTrack | undefined {
        if (typeof trackId === "undefined")
            throw new Error("trackId must be defined");
        return this.s.getTrackById.get(trackId);
    }

    getNamesByTrackId(
        trackId: number
    ): NamesWithSortable<"track" | "album" | "artist"> {
        if (typeof trackId === "undefined")
            throw new Error("trackId must be defined");
        return this.s.getNamesByTrackId.get(trackId);
    }

    getLastUpdatedByPath(path: string): number | undefined {
        if (typeof path === "undefined")
            throw new Error("path must be defined");
        return this.s.getTrackLastUpdatedByPath.get(path)?.lastUpdated;
    }

    getAlbumArtByHash(hash: string): AlbumArt | undefined {
        if (typeof hash === "undefined")
            throw new Error("hash must be defined");
        return this.s.getAlbumArtByHash.get(hash);
    }

    getAlbumArtInfoByHash(hash: string): Omit<AlbumArt, "source"> | undefined {
        if (typeof hash === "undefined")
            throw new Error("hash must be defined");
        return this.s.getAlbumArtInfoByHash.get(hash);
    }

    getFirstArtistLettersByTrackIds(trackIds: number[]): string[] {
        this.s.getFirstSongLetters_createTempTable.run();
        const s = new GetFirstArtistLettersStatements(this.db);
        for (const item of trackIds) s.insertToTempTable.run(item);
        const result = s.getByTrackId.all().map(el => el.firstLetter);
        s.deleteTempTable.run();
        return result;
    }

    async inTransaction(cb: () => Promise<void>): Promise<void> {
        this.s.beginTransaction.run();
        await cb();
        this.s.commitTransaction.run();
    }

    vacuum(): void {
        this.s.vacuum.run();
    }
}
