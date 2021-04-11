import Table from "./Table";

export interface Song {
    id: number;
    albumId: number;
    name: string;
    path: string;
    duration: number;
}

export default class SongTable extends Table<Song> {
    protected readonly preferredIndices = ["id", "albumId"] as const;

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

    hasNamed(name: string, albumId: number): Promise<boolean> {
        const id = this.getId(name, albumId);
        return this.table.includes({id: v => parseInt(v) === id});
    }

    async add(
        source: Omit<Song, "id" | "albumId">,
        albumId: number
    ): Promise<Song> {
        const id = this.getId(source.name, albumId);

        const song: Song = {
            id,
            albumId,
            ...source
        };

        await this.table.add(song);

        return song;
    }
}
