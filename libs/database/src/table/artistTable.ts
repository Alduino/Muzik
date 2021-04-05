import Table from "./Table";

export interface Artist {
    id: number;
    name: string;
}

export default class ArtistTable extends Table<Artist> {
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

    async add(name: string): Promise<Artist> {
        const artist: Artist = {
            id: await this.table.getNextSerial("id"),
            name
        };

        await this.table.add(artist);

        return artist;
    }
}
