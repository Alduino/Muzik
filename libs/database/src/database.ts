import initSql, {Database as SqliteDatabase} from "sql.js";
import {dirname} from "path";
import {existsSync} from "fs";
import {mkdir, readFile} from "fs/promises";
import {configLocator} from "./config-locator";
import {log} from "./logger";
import AlbumTable from "./table/albumTable";
import SongTable from "./table/songTable";

export class Database {
    public static defaultLocation = configLocator.getFile("db.sqlite");
    private initialised = false;

    private constructor(private readonly db: SqliteDatabase) {}

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

        const SQL = await initSql();
        const db = new SQL.Database(data);

        return new Database(db);
    }

    initialise(): void {
        if (this.initialised) {
            throw new Error("Database is already initialised");
        }

        log.debug("Initialising the database");
        this._songs.initialise();
        this._albums.initialise();
    }

    private checkInitialised(): void {
        if (!this.initialised) {
            throw new Error("Database is not initialised");
        }
    }
}
