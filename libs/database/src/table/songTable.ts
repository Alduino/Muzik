import {Database} from "better-sqlite3";
import AlbumTable, {Album} from "./albumTable";

interface DirectSong {
    id: number;
    albumId: number;
    name: string;
}

export interface Song extends DirectSong {
    album: Album;
}

export default class SongTable {
    constructor(private db: Database) {}

    initialise() {
        this.db
            .prepare(
                `
            CREATE TABLE IF NOT EXISTS songs (
                id INT PRIMARY KEY NOT NULL,
                albumId INT NOT NULL,
                name TEXT NOT NULL,
                FOREIGN KEY (albumId) REFERENCES albums (id)
            )
        `
            )
            .run();
    }

    get(id: number): Song {
        const directSong: DirectSong = this.db
            .prepare("SELECT * FROM songs WHERE id = ?")
            .get(id);

        const albumTable = new AlbumTable(this.db);

        return {
            ...directSong,
            album: albumTable.get(directSong.albumId)
        };
    }
}
