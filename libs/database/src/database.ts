import createDatabase, {Database as SqliteDatabase} from "better-sqlite3";
import {dirname} from "path";
import {mkdir} from "fs/promises";
import {configLocator} from "./config-locator";
import {log} from "./logger";
import AlbumTable from "./table/albumTable";
import SongTable from "./table/songTable";

export class Database {
    public static defaultLocation = configLocator.getFile("db.sqlite");
    private initialised = false;

    private constructor(private readonly db: SqliteDatabase) {}

    private _albums = new AlbumTable(this.db);

    get albums() {
        this.checkInitialised();
        return this._albums;
    }

    private _songs = new SongTable(this.db);

    get songs() {
        this.checkInitialised();
        return this._songs;
    }

    public static async create(path: string) {
        log.debug("Loading database at %s", path);
        await mkdir(dirname(path), {recursive: true});

        const db = createDatabase(path, {
            verbose: log.debug.bind(log)
        });

        return new Database(db);
    }

    initialise() {
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
