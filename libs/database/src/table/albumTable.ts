import Table from "./Table";

export interface AlbumArt {
    path: string;
    mime: string;
}

export interface Album {
    id: number;
    artistId: number;
    name: string;
    art: AlbumArt | null;
}

export default class AlbumTable extends Table<Album> {
    protected readonly preferredIndices = ["id", "artistId"] as const;

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

    hasNamed(name: string, artistId: number): Promise<boolean> {
        const id = this.getId(name, artistId);
        return this.table.includes({id: v => parseInt(v) === id});
    }

    async add(
        name: string,
        art: AlbumArt | null,
        artistId: number
    ): Promise<Album> {
        const id = this.getId(name, artistId);

        const album: Album = {
            id,
            artistId,
            name,
            art
        };

        await this.table.add(album);

        return album;
    }
}
