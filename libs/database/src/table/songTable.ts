import Table from "./Table";

export interface Song {
    id: number;
    albumId: number;
    name: string;
}

export default class SongTable extends Table<Song> {
    async initialise(): Promise<void> {
        await super.initialise();
        await this.table.createIndex("id");
        await this.table.createIndex("albumId");
        await this.table.createIndex("name");
    }

    get(id: number): Promise<Song | null> {
        return this.table.find({
            id: v => id === parseInt(v)
        });
    }

    async add(
        source: Omit<Song, "id" | "albumId">,
        albumId: number
    ): Promise<Song> {
        const song: Song = {
            id: await this.table.getNextSerial("id"),
            albumId,
            ...source
        };

        await this.table.add(song);

        return song;
    }
}
