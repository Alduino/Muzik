import Table from "./Table";

export interface Album {
    id: number;
    name: string;
    artPath: string;
    artist: string;
}

export default class AlbumTable extends Table {
    initialise(): void {
        this.db.run(
            `
            CREATE TABLE IF NOT EXISTS albums (
                id INT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                artPath TEXT NOT NULL,
                artist TEXT NOT NULL
            )
        `
        );
    }

    get(id: number): Album {
        return this.run<Album>`
            SELECT * FROM albums WHERE id = ${id}
        `;
    }
}
