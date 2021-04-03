import Table from "./Table";

export interface Album {
    id: number;
    name: string;
    artPath: string;
    artist: string;
}

export default class AlbumTable extends Table<Album> {
    async initialise(): Promise<void> {
        await super.initialise();
        await this.table.createIndex("id");
    }

    get(id: number): Promise<Album | null> {
        return this.table.find({
            id: v => id === parseInt(v)
        });
    }
}
