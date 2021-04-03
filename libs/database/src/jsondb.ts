import {join} from "path";
import {createReadStream, existsSync} from "fs";
import {mkdir, open as openFile, readFile, writeFile} from "fs/promises";
import {createInterface as createRl} from "readline";
import {log} from "./logger";

/* JSON DB FORMAT
 * ==============
 *
 * Tables each have their own directory. These contain a file `data.jsonl` which is each value on a separate line.
 * The line number is used as an internal "id" of this value.
 *
 * Tables also have various files for indices, which are stored in various `[column]-index.txt` files. These are files
 * with one value per line, where the line maps to the same line of the data file.
 *
 * Because lines aren't a very good way to quickly read a file, there is also an `offsets.bin` file. This file stores a
 * list of offsets per line, so that we can pass in a line number and get an offset out. It is a binary data of 2x u32
 * values (offset, length) per line in the other files, so we know the value is at the offset (line * 8).
 *
 * There is another file, `info.json`, which is used to load some information about the table on initialisation. This
 * file contains a key, "indices", which is an array of the indexes used.
 */

type ValidKeys<T> = Extract<keyof T, string>;

type Predicate = (value: string) => boolean;

type KeyedPredicate<T extends string> = {
    [Key in T]: Predicate;
};

type FullPredicates<T> = KeyedPredicate<ValidKeys<T>>;
type Predicates<T> = Partial<FullPredicates<T>>;

interface Info<T> {
    indices: ValidKeys<T>[];
}

export default class JsonTable<T> {
    private static FN_DATA = "data.jsonl";
    private static FN_OFFSETS = "offsets.bin";
    private static FN_INFO = "info.json";

    private readonly dataPath = this.getPath(JsonTable.FN_DATA);
    private readonly offsetsPath = this.getPath(JsonTable.FN_OFFSETS);
    private readonly infoPath = this.getPath(JsonTable.FN_INFO);

    private info: Info<T> = {
        indices: []
    };

    constructor(private dir: string) {}

    async initialise(): Promise<void> {
        await mkdir(this.dir, {recursive: true});
        await this.loadOrSaveInfo();
    }

    async createIndex(key: ValidKeys<T>): Promise<void> {
        if (this.info.indices.includes(key)) return;

        const path = this.getIndexPath(key);
        await writeFile(path, "");

        this.info.indices.push(key);
        await this.saveInfo();
    }

    /**
     * Returns the first value that matches all the predicates
     * @param predicates - Key is row name, value is predicate function. Note all values are in their toString() form.
     * @param preferredIndices - Preferred indices to check, in order
     * @returns - Value if it exists, otherwise null
     */
    find(
        predicates: Predicates<T>,
        preferredIndices: ValidKeys<T>[] = []
    ): Promise<T | null> {
        if (preferredIndices.some(it => !this.info.indices.includes(it))) {
            throw new Error(
                "A preferred index does not map to an actual index"
            );
        }

        const keys = Object.keys(predicates) as ValidKeys<T>[];

        if (keys.length === 0) {
            throw new Error("At least one predicate must be specified");
        }

        const indexedKeys = keys.filter(key => this.info.indices.includes(key));

        // casting to FullPredicates is not strictly correct, but it makes typing simpler below,
        // as in this case we know better than TypeScript.

        // if there are no indexed keys we just get from the data
        if (indexedKeys.length === 0)
            return this.findFromData(keys, predicates as FullPredicates<T>);

        // otherwise begin a search for the value
        return this.findFromIndex(
            keys,
            indexedKeys,
            predicates as FullPredicates<T>
        );
    }

    /**
     * Searches through data to find an ID that matches
     * @param keys - List of keys in predicates object
     * @param indexedKeys - List of index keys, in search order
     * @param predicates - Predicates object
     * @private
     */
    private async findFromIndex(
        keys: ValidKeys<T>[],
        indexedKeys: ValidKeys<T>[],
        predicates: FullPredicates<T>
    ): Promise<T | null> {
        for (const indexKey of indexedKeys) {
            log.trace("Searching with key %s", indexKey);

            const id = await this.findIdFromIndex(
                indexKey,
                predicates[indexKey]
            );
            if (id === -1) continue;

            const {offset, length} = await this.getOffsetFromId(id);
            log.trace(
                "Found index match at %i (%i+%i), comparing with other predicates",
                id,
                offset,
                length
            );

            const dataString = await this.readData(offset, length);
            const data = JSON.parse(dataString);

            const allMatch = keys.every(key => {
                const stringValue: string = data[key]?.toString() || "null";
                return predicates[key](stringValue);
            });

            if (allMatch) {
                log.trace("All predicates match, returning value");
                return data;
            }
        }

        return null;
    }

    /**
     * Reads the data file at the specified offset and length
     * @private
     */
    private async readData(offset: number, length: number): Promise<string> {
        const fd = await openFile(this.dataPath, "r");

        const buffer = new Buffer(length);
        await fd.read(buffer, 0, length, offset);
        await fd.close();

        return buffer.toString("utf-8");
    }

    /**
     * Returns the byte offset data of the specified line
     * @param id - The line index
     * @private
     */
    private async getOffsetFromId(
        id: number
    ): Promise<{offset: number; length: number}> {
        const fd = await openFile(this.offsetsPath, "r");

        const buffer = new Buffer(4);
        await fd.read(buffer, 0, 8, id * 8);
        await fd.close();

        return {
            offset: buffer.readUInt32BE(0),
            length: buffer.readUInt32BE(4)
        };
    }

    /**
     * Searches through data to find the ID.
     * @remark If possible, use {@see findIdFromIndex}, as it is much faster.
     * @param keys - List of rows to search
     * @param predicates - Getter object
     * @private
     */
    private async findFromData(
        keys: ValidKeys<T>[],
        predicates: FullPredicates<T>
    ): Promise<T | null> {
        const stream = createReadStream(this.dataPath);
        const rl = createRl({input: stream});

        let foundItem: T | null = null;
        for await (const line of rl) {
            const value = JSON.parse(line);

            let noMatch = false;
            for (const key of keys) {
                const keyValue = value[key];
                const stringValue: string = keyValue?.toString() || "null";

                if (!predicates[key](stringValue)) {
                    noMatch = true;
                    break;
                }
            }

            if (!noMatch) {
                foundItem = value;
                break;
            }
        }

        rl.close();

        return foundItem;
    }

    /**
     * Finds the first matching line. Requires key to have an index.
     * @remark This is the preferred method to call if possible, as it is fast.
     * @param key - Row name
     * @param predicate - Function to check for the correct value
     * @private
     */
    private async findIdFromIndex<Key extends ValidKeys<T>>(
        key: Key,
        predicate: Predicate
    ): Promise<number> {
        if (!this.info.indices.includes(key))
            throw new Error(`${key} does not have an index`);

        const path = this.getIndexPath(key);
        const stream = createReadStream(path);
        const rl = createRl({input: stream});

        let id = 0,
            found = false;
        for await (const line of rl) {
            if (predicate(line)) {
                found = true;
                break;
            }

            id++;
        }

        rl.close();

        if (found) return id;
        return -1;
    }

    private getIndexPath(name: string) {
        if (/[/\\]/.test(name)) {
            throw new Error("Name contains invalid characters");
        }

        return this.getPath(`${name}-index.jsonl`);
    }

    private getPath(name: string) {
        return join(this.dir, name);
    }

    private async saveInfo(): Promise<void> {
        await writeFile(this.infoPath, JSON.stringify(this.info));
    }

    private async loadInfo(): Promise<void> {
        const source = await readFile(this.infoPath, "utf-8");
        this.info = JSON.parse(source);
    }

    private async loadOrSaveInfo(): Promise<void> {
        if (!existsSync(this.infoPath)) {
            await this.saveInfo();
        } else {
            await this.loadInfo();
        }
    }
}
