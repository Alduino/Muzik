import initSql, {Database as SqliteDatabase} from "sql.js";
import {dirname} from "path";
import {existsSync} from "fs";
import {mkdir, readFile, writeFile} from "fs/promises";
import {configLocator} from "./config-locator";
import {log} from "./logger";
import AlbumTable from "./table/albumTable";
import SongTable from "./table/songTable";

export class Database {
    public static defaultLocation = configLocator.getFile("db.sqlite");
    private initialised = false;

    private constructor(
        private readonly db: SqliteDatabase,
        private readonly savePath: string
    ) {}

    private _albums = new AlbumTable(this.db);

    get albums(): AlbumTable {
        this.checkInitialised();
        return this._albums;
    }

    private _songs = new SongTable(this.db);

    get songs(): SongTable {
        this.checkInitialised();
        return this._songs;
    }

    public static async create(path: string): Promise<Database> {
        log.debug("Loading database at %s", path);
        await mkdir(dirname(path), {recursive: true});

        const data = existsSync(path) ? await readFile(path) : null;
        if (!data)
            log.debug(
                "Database does not already exist, will create when saved"
            );

        const SQL = await initSql();
        const db = new SQL.Database(data);

        return new Database(db, path);
    }

    initialise(): void {
        if (this.initialised) {
            throw new Error("Database is already initialised");
        }

        log.debug("Initialising the database");
        this._songs.initialise();
        this._albums.initialise();
    }

    async save(): Promise<void> {
        log.debug("Saving database to %s", this.savePath);
        const data = this.db.export();
        await writeFile(this.savePath, data);
    }

    private checkInitialised(): void {
        if (!this.initialised) {
            throw new Error("Database is not initialised");
        }
    }
}
