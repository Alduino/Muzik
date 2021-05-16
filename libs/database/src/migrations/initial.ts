import {Migration} from "../migration-manager";
import {Database} from "better-sqlite3";

class UpStatements {
    readonly createAlbumArtTable = this.db.prepare(`
        CREATE TABLE albumArt (
            hash TEXT,
            avgColour TEXT,
            mimeType TEXT,
            source BLOB,
            PRIMARY KEY (hash)
        )
    `);
    readonly createArtistsTable = this.db.prepare(`
        CREATE TABLE artists (
            id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            lastUpdated DATETIME,
            name TEXT,
            sortableName TEXT
        )
    `);
    readonly createAlbumsTable = this.db.prepare(`
        CREATE TABLE albums (
            id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            lastUpdated DATETIME,
            artistId INTEGER,
            name TEXT,
            sortableName TEXT,
            FOREIGN KEY (artistId) REFERENCES artists (id)
        )
    `);
    readonly createTracksTable = this.db.prepare(`
        CREATE TABLE tracks (
            id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            lastUpdated DATETIME,
            albumId INTEGER,
            albumArtHash TEXT NULL,
            name TEXT,
            sortableName TEXT,
            releaseDate DATE NULL,
            duration FLOAT,
            trackNo INTEGER NULL,
            audioSrcPath TEXT,
            FOREIGN KEY (albumId) REFERENCES albums(id),
            FOREIGN KEY (albumArtHash) REFERENCES albumArt(hash)
        )
    `);

    constructor(private readonly db: Database) {}
}

class UpModStatements {
    readonly createArtistsUniqueConstr = this.db.prepare(`
        CREATE UNIQUE INDEX artists_sortablename_unique
        ON artists (sortableName)
    `);
    readonly createArtistsSortableNameIndex = this.db.prepare(`
        CREATE INDEX artists_sortablename_index
        ON artists (sortableName)
    `);
    readonly createAlbumsUniqueConstr = this.db.prepare(`
        CREATE UNIQUE INDEX albums_artistid_sortablename_unique
        ON albums (artistId, sortableName)
    `);
    readonly createAlbumsSortableNameIndex = this.db.prepare(`
        CREATE INDEX albums_sortablename_index
        ON albums (sortableName)
    `);
    readonly createTracksUniqueConstr = this.db.prepare(`
        CREATE UNIQUE INDEX tracks_audiosrcpath_unique
        ON tracks (audioSrcPath)
    `);
    readonly createTracksAlbumIdIndex = this.db.prepare(`
        CREATE INDEX tracks_albumid_index
        ON tracks (albumId)
    `);
    readonly createTracksAudioSrcPathIndex = this.db.prepare(`
        CREATE INDEX tracks_audiosrcpath_index
        ON tracks (audioSrcPath)
    `);

    constructor(private readonly db: Database) {}
}

class DownStatements {
    readonly dropTracks = this.db.prepare("DROP TABLE tracks");
    readonly dropAlbums = this.db.prepare("DROP TABLE albums");
    readonly dropArtists = this.db.prepare("DROP TABLE artists");
    readonly dropAlbumArt = this.db.prepare("DROP TABLE albumArt");

    constructor(private readonly db: Database) {}
}

const migration: Migration = {
    up(db: Database) {
        const s = new UpStatements(db);

        s.createAlbumArtTable.run();
        s.createArtistsTable.run();
        s.createAlbumsTable.run();
        s.createTracksTable.run();

        const sm = new UpModStatements(db);

        sm.createArtistsUniqueConstr.run();
        sm.createArtistsSortableNameIndex.run();

        sm.createAlbumsUniqueConstr.run();
        sm.createAlbumsSortableNameIndex.run();

        sm.createTracksUniqueConstr.run();
        sm.createTracksAlbumIdIndex.run();
        sm.createTracksAudioSrcPathIndex.run();
    },
    down(db: Database) {
        const s = new DownStatements(db);

        s.dropTracks.run();
        s.dropAlbums.run();
        s.dropArtists.run();
        s.dropAlbumArt.run();
    }
};

export default migration;
