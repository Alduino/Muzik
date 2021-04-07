import stringHash from "string-hash";
import JsonTable, {Predicates, ValidKeysArray} from "../jsondb";

export default abstract class Table<T> {
    protected abstract readonly preferredIndices: ValidKeysArray<T>;
    protected readonly table: JsonTable<T>;
    private readonly className = this.constructor.name;

    constructor(dir: string) {
        this.table = new JsonTable<T>(dir);
    }

    getId(name: string, parentId = 0) {
        const nameForHash = `${this.className}:${name}`;
        return stringHash(nameForHash) ^ parentId;
    }

    getAll(): Promise<T[]> {
        return this.table.getAll();
    }

    getMatching(predicates: Predicates<T>) {
        return this.table.filter(predicates, this.preferredIndices);
    }

    initialise(): Promise<void> {
        return this.table.initialise();
    }
}
