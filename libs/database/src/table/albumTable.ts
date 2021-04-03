import {Database} from "better-sqlite3";

export interface Album {
    id: number;
    name: string;
    artPath: string;
    artist: string;
}

export default class AlbumTable {
    constructor(private db: Database) {}

    initialise() {
        this.db
            .prepare(
                `
            CREATE TABLE IF NOT EXISTS albums (
                id INT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                artPath TEXT NOT NULL,
                artist TEXT NOT NULL
            )
        `
            )
            .run();
    }

    get(id: number): Album {
        return this.db.prepare("SELECT * FROM albums WHERE id = ?").get(id);
    }
}
