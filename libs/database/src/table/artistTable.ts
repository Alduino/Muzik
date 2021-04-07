import Table from "./Table";

export interface Artist {
    id: number;
    name: string;
}

export default class ArtistTable extends Table<Artist> {
    protected readonly preferredIndices = ["id"] as const;

    async initialise(): Promise<void> {
        await super.initialise();
        await this.table.createIndex("id");
        await this.table.createIndex("name");
    }

    get(id: number): Promise<Artist | null> {
        return this.table.find({
            id: v => id === parseInt(v)
        });
    }

    hasNamed(name: string): Promise<boolean> {
        const id = this.getId(name);
        return this.table.includes({id: v => parseInt(v) === id});
    }

    async add(name: string): Promise<Artist> {
        const id = this.getId(name);

        const artist: Artist = {
            id,
            name
        };

        await this.table.add(artist);

        return artist;
    }
}
