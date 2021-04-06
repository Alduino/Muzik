import stringHash from "string-hash";
import JsonTable from "../jsondb";

export default abstract class Table<T> {
    private readonly className = this.constructor.name;

    protected readonly table: JsonTable<T>;

    getId(name: string, parentId = 0) {
        const nameForHash = `${this.className}:${name}`;
        return stringHash(nameForHash) ^ parentId;
    }

    getAll(): Promise<T[]> {
        return this.table.getAll();
    }

    initialise(): Promise<void> {
        return this.table.initialise();
    }

    constructor(dir: string) {
        this.table = new JsonTable<T>(dir);
    }
}
