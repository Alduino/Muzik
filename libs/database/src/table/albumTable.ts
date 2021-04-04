import Table from "./Table";

export interface Album {
    id: number;
    artistId: number;
    name: string;
    artPath: string;
}

export default class AlbumTable extends Table<Album> {
    async initialise(): Promise<void> {
        await super.initialise();
        await this.table.createIndex("id");
        await this.table.createIndex("artistId");
        await this.table.createIndex("name");
    }

    get(id: number): Promise<Album | null> {
        return this.table.find({
            id: v => id === parseInt(v)
        });
    }
}
