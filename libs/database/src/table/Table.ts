import JsonTable from "../jsondb";

export default abstract class Table<T> {
    protected readonly table: JsonTable<T>;

    initialise(): Promise<void> {
        return this.table.initialise();
    }

    constructor(dir: string) {
        this.table = new JsonTable<T>(dir);
    }
}
