import Table from "./Table";

export interface Album {
    id: number;
    artistId: number;
    name: string;
    artPath: string | null;
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

    async add(
        name: string,
        artPath: string | null,
        artistId: number
    ): Promise<Album> {
        const album: Album = {
            id: await this.table.getNextSerial("id"),
            artistId,
            name,
            artPath
        };

        await this.table.add(album);

        return album;
    }
}
