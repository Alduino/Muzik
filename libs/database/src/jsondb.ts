import {join} from "path";
import {createReadStream, existsSync} from "fs";
import {
    appendFile,
    FileHandle,
    mkdir,
    open as openFile,
    readFile,
    rename,
    stat,
    unlink,
    writeFile
} from "fs/promises";
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

export type ValidKeys<T> = Extract<keyof T, string>;
export type ValidKeysArray<T> = readonly ValidKeys<T>[];

type Predicate = (value: string) => boolean;

type KeyedPredicate<T extends string> = {
    [Key in T]: Predicate;
};

type FullPredicates<T> = KeyedPredicate<ValidKeys<T>>;
export type Predicates<T> = Partial<FullPredicates<T>>;

type ValueIndexResult<T> = {value: T; id: number};

interface Info<T> {
    indices: ValidKeys<T>[];
    serials: {[name: string]: number};
}

export default class JsonTable<T> {
    private static FN_DATA = "data.jsonl";
    private static FN_OFFSETS = "offsets.bin";
    private static FN_INFO = "info.json";

    private readonly dataPath = this.getPath(JsonTable.FN_DATA);
    private readonly offsetsPath = this.getPath(JsonTable.FN_OFFSETS);
    private readonly infoPath = this.getPath(JsonTable.FN_INFO);

    private info: Info<T> = {
        indices: [],
        serials: {}
    };

    constructor(private dir: string) {}

    /**
     * Deletes a single line of a file
     * @remarks Use {@see deleteFileSegment} if possible, it is faster
     * @param path - Path to the file
     * @param line - The line number to delete
     * @private
     */
    private static async deleteLine(path: string, line: number): Promise<void> {
        const oldPath = `${path}.tmp`;

        // move old version to a temporary file so we can stream from it
        await rename(path, oldPath);

        const oldStream = await createReadStream(oldPath);
        const newFd = await openFile(path, "wx");

        const rl = createRl(oldStream);

        let currentLine = 0;
        for await (const lineValue of rl) {
            if (line !== currentLine) {
                await newFd.write(lineValue + "\n");
            }

            currentLine++;
        }

        rl.close();
        await newFd.close();

        await unlink(oldPath);
    }

    /**
     * Deletes a portion of a file
     * @remarks Very slow
     * @param path - Path to the file
     * @param offset - Offset from the start of the file
     * @param length - Number of bytes to delete
     * @private
     */
    private static async deleteFileSegment(
        path: string,
        offset: number,
        length: number
    ): Promise<void> {
        const oldPath = `${path}.tmp`;
        const oldSize = (await stat(path)).size;

        // move old version to a temporary file so we can stream from it
        await rename(path, oldPath);

        const oldFd = await openFile(oldPath, "r");
        const newFd = await openFile(path, "wx");

        const buffer = Buffer.allocUnsafe(16384);

        // write the bytes that are the same
        let currentPosition = 0;
        while (currentPosition < offset) {
            const readCount = Math.min(buffer.length, offset - currentPosition);
            const {bytesRead} = await oldFd.read(
                buffer,
                0,
                readCount,
                currentPosition
            );
            await newFd.write(buffer, 0, bytesRead);
            currentPosition += bytesRead;
        }

        // skip length then write the new bytes
        currentPosition += length;

        while (currentPosition < oldSize) {
            const readCount = Math.min(
                buffer.length,
                oldSize - currentPosition
            );
            const {bytesRead} = await oldFd.read(
                buffer,
                0,
                readCount,
                currentPosition
            );
            await newFd.write(buffer, 0, bytesRead);
            currentPosition += bytesRead;
        }

        await oldFd.close();
        await newFd.close();

        await unlink(oldPath);
    }

    async initialise(): Promise<void> {
        await mkdir(this.dir, {recursive: true});
        await this.loadOrSaveInfo();
        await this.maybeCreateOffsets();
        await this.maybeCreateDataFile();
    }

    async createIndex(key: ValidKeys<T>): Promise<void> {
        if (this.info.indices.includes(key)) return;

        const path = this.getIndexPath(key);
        await writeFile(path, "");

        this.info.indices.push(key);
        await this.saveInfo();
    }

    /**
     * Returns true if some value matches the predicate
     * @remarks May be slightly faster than {@see find} if no predicates use the data
     * @param predicates - Key is row name, value is predicate function. Note all values are in their toString() form.
     * @param preferredIndices - Preferred indices to check, in order
     */
    includes(
        predicates: Predicates<T>,
        preferredIndices: ValidKeysArray<T> = []
    ): Promise<boolean> {
        const {keys, indexedKeys} = this.getComparisonValues(
            predicates,
            preferredIndices
        );

        // casting to FullPredicates is not strictly correct, but it makes typing simpler below,
        // as in this case we know better than TypeScript.

        // if there are no indexed keys we just get from the data
        if (indexedKeys.length === 0)
            return this.findFromData(
                keys,
                predicates as FullPredicates<T>
            ).then(res => res.id === -1);

        // otherwise try and find its index
        return this.existsFromIndex(
            keys,
            indexedKeys,
            predicates as FullPredicates<T>
        );
    }

    /**
     * Returns the first value that matches all the predicates
     * @param predicates - Key is row name, value is predicate function. Note all values are in their toString() form.
     * @param preferredIndices - Preferred indices to check, in order
     * @returns - Value if it exists, otherwise null
     */
    find(
        predicates: Predicates<T>,
        preferredIndices: ValidKeysArray<T> = []
    ): Promise<T | null> {
        const {keys, indexedKeys} = this.getComparisonValues(
            predicates,
            preferredIndices
        );

        // casting to FullPredicates is not strictly correct, but it makes typing simpler below,
        // as in this case we know better than TypeScript.

        // if there are no indexed keys we just get from the data
        if (indexedKeys.length === 0)
            return this.findFromData(
                keys,
                predicates as FullPredicates<T>
            ).then(v => v.value);

        // otherwise begin a search for the value
        return this.findFromIndex(
            keys,
            indexedKeys,
            predicates as FullPredicates<T>
        );
    }

    /**
     * Returns all values that matches all the predicates
     * @param predicates - Key is row name, value is predicate function. Note all values are in their toString() form.
     * @param preferredIndices - Preferred indices to check, in order
     */
    filter(
        predicates: Predicates<T>,
        preferredIndices: ValidKeysArray<T> = []
    ): Promise<T[]> {
        const {keys, indexedKeys} = this.getComparisonValues(
            predicates,
            preferredIndices
        );

        // casting to FullPredicates is not strictly correct, but it makes typing simpler below,
        // as in this case we know better than TypeScript.

        if (indexedKeys.length === 0)
            return this.filterFromData(
                keys,
                predicates as FullPredicates<T>
            ).then(res => res.map(item => item.value));

        // otherwise begin a search for values
        return this.filterFromIndex(
            keys,
            indexedKeys,
            predicates as FullPredicates<T>
        );
    }

    async getAll(): Promise<T[]> {
        const stream = createReadStream(this.dataPath);
        const rl = createRl(stream);

        const result: T[] = [];

        for await (const line of rl) {
            result.push(JSON.parse(line));
        }

        return result;
    }

    /**
     * Returns the first id that matches. Note, `id` is a transparent value that you shouldn't rely on.
     * @param predicates - Key is row name, value is predicate function. Note all values are in their toString() form.
     * @param preferredIndices - Preferred indices to check, in order
     * @returns - A transparent identifier for the matching row
     */
    getIdentifier(
        predicates: Predicates<T>,
        preferredIndices: ValidKeysArray<T> = []
    ): Promise<number> {
        const {keys, indexedKeys} = this.getComparisonValues(
            predicates,
            preferredIndices
        );

        return this.getIndex(
            keys,
            indexedKeys,
            predicates as FullPredicates<T>
        );
    }

    /**
     * Deletes the value at the specified identifier
     * @remarks Identifier is not valid after this operation
     * @param identifier - A transparent identifier of the row, returned by {@see getIdentifier}
     */
    async delete(identifier: number): Promise<void> {
        if (identifier < 0) throw new Error("Invalid identifier");
        await this.deleteRow(identifier);
        await this.recalculateOffsets(identifier);
    }

    /**
     * Replaces the value at the specified identifier
     * @remarks Identifier is not valid after this operation
     * @param identifier - A transparent identifier of the row, returned by {@see getIdentifier}
     * @param value - The value to replace with
     */
    async replace(identifier: number, value: T): Promise<void> {
        if (identifier < 0) throw new Error("Invalid identifier");
        await this.deleteRow(identifier);
        await this.add(value);
        await this.recalculateOffsets(identifier);
    }

    /**
     * Adds a new row with the specified value
     * @private
     */
    async add(value: T): Promise<void> {
        const keys = Object.keys(value) as ValidKeys<T>[];
        const indices = keys.filter(key => this.info.indices.includes(key));

        const dataIndex = (await stat(this.dataPath)).size;
        const dataValue = JSON.stringify(value);

        const offsetsDataBuffer = Buffer.allocUnsafe(8);
        offsetsDataBuffer.writeUInt32LE(dataIndex, 0);
        offsetsDataBuffer.writeUInt32LE(
            Buffer.byteLength(dataValue, "utf-8"),
            4
        );

        // append to every file
        await appendFile(this.dataPath, dataValue + "\n");
        await appendFile(this.offsetsPath, offsetsDataBuffer);

        for (const index of indices) {
            const path = this.getIndexPath(index);
            const indexValue = value[index] as T[ValidKeys<T>] & {
                toString(): string;
            };
            await appendFile(path, indexValue + "\n");
        }
    }

    /**
     * Adds multiple rows at one time
     * @param values
     */
    async addMany(values: T[]): Promise<void> {
        if (values.length === 0) return;

        const keys = Object.keys(values[0]) as ValidKeys<T>[];
        const indices = keys.filter(key => this.info.indices.includes(key));

        let dataIndex = (await stat(this.dataPath)).size;

        const dataValues = values.map(v => JSON.stringify(v));
        const dataValue = dataValues.join("\n");

        const offsetsDataBuffer = Buffer.allocUnsafe(dataValues.length * 8);

        for (let i = 0; i < dataValues.length; i++) {
            const value = dataValues[i];
            offsetsDataBuffer.writeUInt32LE(dataIndex, i * 8);
            offsetsDataBuffer.writeUInt32LE(
                Buffer.byteLength(dataValue, "utf-8"),
                i * 8 + 4
            );
            dataIndex += value.length + 1;
        }

        await appendFile(this.dataPath, dataValue + "\n");
        await appendFile(this.offsetsPath, offsetsDataBuffer);

        for (const index of indices) {
            const path = this.getIndexPath(index);

            const indexValues = values
                .map(v =>
                    (v[index] as T[ValidKeys<T>] & {
                        toString(): string;
                    }).toString()
                )
                .join("\n");

            await appendFile(path, indexValues + "\n");
        }
    }

    /**
     * Returns the next serial value
     * @remarks Same as `allocateSerials(name, 1)`
     * @param name - The name of the serial
     */
    getNextSerial(name: string): Promise<number> {
        return this.allocateSerials(name, 1);
    }

    /**
     * Allocates many serial keys, and returns the first one
     * @remarks Other values can be calculated by adding the index to the return value
     * @param name - The name of the serial
     * @param count - The amount to allocate
     */
    async allocateSerials(name: string, count: number): Promise<number> {
        const current = this.info.serials[name] ?? -1;
        this.info.serials[name] = current + count;
        await this.saveInfo();
        return current + 1;
    }

    /**
     * Deletes the specified row
     * @param id - Row number
     * @private
     */
    private async deleteRow(id: number): Promise<void> {
        const {
            offset: originalOffset,
            length: originalLength
        } = await this.getOffsetFromId(id);

        await JsonTable.deleteFileSegment(this.offsetsPath, id * 8, 8);

        await JsonTable.deleteFileSegment(
            this.dataPath,
            originalOffset,
            originalLength + 1
        );

        for (const index of this.info.indices) {
            const path = await this.getIndexPath(index);
            await JsonTable.deleteLine(path, id);
        }
    }

    /**
     * Recalculates all the offsets after start
     * @param start - ID of the row to start with
     * @private
     */
    private async recalculateOffsets(start: number) {
        const offsetFd = await openFile(this.offsetsPath, "r+");

        const dataStream = createReadStream(this.dataPath);
        const rl = createRl(dataStream);

        const writeBuffer = Buffer.allocUnsafe(8);

        let currentLine = 0,
            dataPosition = 0,
            offsetPosition = 0;
        for await (const line of rl) {
            if (currentLine >= start) {
                writeBuffer.writeUInt32LE(dataPosition, 0);
                writeBuffer.writeUInt32LE(line.length, 4);
                await offsetFd.write(writeBuffer, 0, 8, offsetPosition);
            }

            currentLine++;
            dataPosition += line.length + 1;
            offsetPosition += 8;
        }

        rl.close();
        await offsetFd.close();
    }

    private getComparisonValues(
        predicates: Predicates<T>,
        preferredIndices: ValidKeysArray<T> = []
    ) {
        if (preferredIndices.some(it => !this.info.indices.includes(it))) {
            throw new Error(
                "A preferred index does not map to an actual index"
            );
        }

        const keys = Object.keys(predicates) as ValidKeys<T>[];

        if (keys.length === 0) {
            throw new Error("At least one predicate must be specified");
        }

        // use the set to deduplicate the values
        const indexedKeysSet = new Set([
            ...preferredIndices.filter(v => keys.includes(v)),
            ...keys.filter(key => this.info.indices.includes(key))
        ]);
        const indexedKeys = Array.from(indexedKeysSet.values());

        return {
            keys,
            indexedKeys
        };
    }

    private async maybeCreateOffsets() {
        if (!existsSync(this.offsetsPath)) {
            await writeFile(this.offsetsPath, "");
        }
    }

    private async maybeCreateDataFile() {
        if (!existsSync(this.dataPath)) {
            await writeFile(this.dataPath, "");
        }
    }

    /**
     * Returns the first matching id
     * @param keys - List of keys in predicates object
     * @param indexedKeys - List of index keys, in search order
     * @param predicates - Predicates object
     * @private
     */
    private async getIndex(
        keys: ValidKeysArray<T>,
        indexedKeys: ValidKeysArray<T>,
        predicates: FullPredicates<T>
    ) {
        for (const indexKey of indexedKeys) {
            log.trace("Searching with key %s", indexKey);

            const id = await this.findIdFromIndex(
                indexKey,
                predicates[indexKey]
            );
            if (id == -1) continue;
            return id;
        }

        const nonIndexKeys = keys.filter(key => !indexedKeys.includes(key));
        if (nonIndexKeys.length > 0) {
            log.trace("Searching with non-indexed keys");
            return await this.findFromData(keys, predicates).then(v => v.id);
        }

        return -1;
    }

    /**
     * Searches through data to see if there is an ID that matches
     * @param keys - List of keys in predicates object
     * @param indexedKeys - List of index keys, in search order
     * @param predicates - Predicates object
     * @private
     */
    private async existsFromIndex(
        keys: ValidKeysArray<T>,
        indexedKeys: ValidKeysArray<T>,
        predicates: FullPredicates<T>
    ): Promise<boolean> {
        for (const indexKey of indexedKeys) {
            log.trace("Searching with key %s", indexKey);

            const id = await this.findIdFromIndex(
                indexKey,
                predicates[indexKey]
            );
            if (id == -1) continue;
            return true;
        }

        const nonIndexKeys = keys.filter(key => !indexedKeys.includes(key));
        if (nonIndexKeys.length > 0) {
            log.trace("Searching with non-indexed keys");
            return (await this.findFromData(keys, predicates)) !== null;
        }

        return false;
    }

    /**
     * Searches through data to find all ids that match
     * @param keys - List of keys in predicates object
     * @param indexedKeys - List of index keys, in search order
     * @param predicates - Predicates object
     * @private
     */
    private async filterFromIndex(
        keys: ValidKeysArray<T>,
        indexedKeys: ValidKeysArray<T>,
        predicates: FullPredicates<T>
    ): Promise<T[]> {
        const result: T[] = [];

        for (const indexKey of indexedKeys) {
            log.trace("Searching with key %s", indexKey);

            const ids = await this.filterIdFromIndex(
                indexKey,
                predicates[indexKey]
            );
            const fd = await openFile(this.offsetsPath, "r");

            for (const id of ids) {
                const {offset, length} = await this.getOffsetFromId(id, fd);

                const dataString = await this.readData(offset, length);
                const data = JSON.parse(dataString);

                const allMatch = keys.every(key => {
                    const stringValue: string = data[key]?.toString() || "null";
                    return predicates[key](stringValue);
                });

                if (allMatch) {
                    result.push(data);
                }
            }

            await fd.close();
        }

        return result;
    }

    /**
     * Searches through data to find an ID that matches
     * @param keys - List of keys in predicates object
     * @param indexedKeys - List of index keys, in search order
     * @param predicates - Predicates object
     * @private
     */
    private async findFromIndex(
        keys: ValidKeysArray<T>,
        indexedKeys: ValidKeysArray<T>,
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
                "Found index match at %s (%s+%s), comparing with other predicates",
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

        const nonIndexKeys = keys.filter(key => !indexedKeys.includes(key));
        if (nonIndexKeys.length !== 0) {
            log.trace("Searching with non-indexed keys");
            return this.findFromData(keys, predicates).then(v => v.value);
        }

        return null;
    }

    /**
     * Reads the data file at the specified offset and length
     * @private
     */
    private async readData(offset: number, length: number): Promise<string> {
        const fd = await openFile(this.dataPath, "r");

        const buffer = Buffer.allocUnsafe(length);

        let totalRead = 0;
        while (totalRead < length) {
            const {bytesRead} = await fd.read(
                buffer,
                totalRead,
                length - totalRead,
                offset
            );
            totalRead += bytesRead;
        }

        await fd.close();

        return buffer.toString("utf-8");
    }

    /**
     * Returns the byte offset data of the specified line
     * @param id - The line index
     * @param handle - A file handle to use
     * @private
     */
    private async getOffsetFromId(
        id: number,
        handle: FileHandle | null = null
    ): Promise<{offset: number; length: number}> {
        const fd = handle ?? (await openFile(this.offsetsPath, "r"));

        const buffer = Buffer.allocUnsafe(8);
        await fd.read(buffer, 0, 8, id * 8);

        if (handle === null) await fd.close();

        return {
            offset: buffer.readUInt32LE(0),
            length: buffer.readUInt32LE(4)
        };
    }

    /**
     * Finds all values that match the predicates
     * @param keys - List of rows to search
     * @param predicates - Getter object
     * @private
     */
    private async filterFromData(
        keys: ValidKeysArray<T>,
        predicates: FullPredicates<T>
    ): Promise<ValueIndexResult<T>[]> {
        const stream = createReadStream(this.dataPath);
        const rl = createRl(stream);

        const result: ValueIndexResult<T>[] = [];

        let index = 0;
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
                result.push({
                    value,
                    id: index
                });
            }

            index++;
        }

        rl.close();

        return result;
    }

    /**
     * Searches through data to find the ID.
     * @remarks If possible, use {@see findIdFromIndex}, as it is much faster.
     * @param keys - List of rows to search
     * @param predicates - Getter object
     * @private
     */
    private async findFromData(
        keys: ValidKeysArray<T>,
        predicates: FullPredicates<T>
    ): Promise<{value: T | null; id: number}> {
        const stream = createReadStream(this.dataPath);
        const rl = createRl({input: stream});

        let foundItem: T | null = null,
            foundIndex = 0;
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

            foundIndex++;
        }

        rl.close();

        return {value: foundItem, id: foundItem === null ? -1 : foundIndex};
    }

    /**
     * Finds all matching lines. Requires key to have an index.
     * @remarks This is the preferred method to call if possible, as it is fast.
     * @param key - Row name
     * @param predicate - Function to check for the correct value
     * @private
     */
    private async filterIdFromIndex(
        key: ValidKeys<T>,
        predicate: Predicate
    ): Promise<number[]> {
        if (!this.info.indices.includes(key))
            throw new Error(`${key} does not have an index`);

        const result: number[] = [];

        const path = this.getIndexPath(key);
        const stream = createReadStream(path);
        const rl = createRl(stream);

        let id = 0;
        for await (const line of rl) {
            if (predicate(line)) {
                result.push(id);
            }

            id++;
        }

        rl.close();

        return result;
    }

    /**
     * Finds the first matching line. Requires key to have an index.
     * @remarks This is the preferred method to call if possible, as it is fast.
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
