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
    }

    get(id: number): Promise<Song | null> {
        return this.table.find({
            id: v => id === parseInt(v)
        });
    }
}
