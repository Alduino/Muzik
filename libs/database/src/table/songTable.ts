import AlbumTable, {Album} from "./albumTable";
import Table from "./Table";

interface DirectSong {
    id: number;
    albumId: number;
    name: string;
}

export interface Song extends DirectSong {
    album: Album;
}

export default class SongTable extends Table {
    initialise(): void {
        this.db.run(
            `
            CREATE TABLE IF NOT EXISTS songs (
                id INT PRIMARY KEY NOT NULL,
                albumId INT NOT NULL,
                name TEXT NOT NULL,
                FOREIGN KEY (albumId) REFERENCES albums (id)
            )
        `
        );
    }

    get(id: number): Song {
        const directSong = this.run<DirectSong>`
            SELECT * FROM songs WHERE id = ${id}
        `;

        const albumTable = new AlbumTable(this.db);

        return {
            ...directSong,
            album: albumTable.get(directSong.albumId)
        };
    }
}
