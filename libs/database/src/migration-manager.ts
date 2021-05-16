import {Database, Statement} from "better-sqlite3";

export interface Migration {
    up(db: Database): void;

    down(knex: Database): void;
}

interface FirstLastName {
    firstName: string | null;
    lastName: string | null;
}

export class MigrationList {
    private migrations = new Map<string, Migration>();

    add(name: string, migration: Migration): void {
        this.migrations.set(name, migration);
    }

    /**
     * Returns migrations between start (exclusive) and end (inclusive)
     */
    getMigrations(
        start?: string,
        end?: string
    ): {migrations: Migration[]} & FirstLastName {
        let hasStarted = typeof start === "undefined";
        let hasNotEnded = typeof end === "undefined";

        const migrations: Migration[] = [];
        let firstName: string | null = null,
            lastName: string | null = null;

        for (const [name, migration] of this.migrations.entries()) {
            if (name === start) {
                hasStarted = true;
                continue;
            }

            if (name === end) {
                hasNotEnded = true;
            }

            if (!hasStarted || !hasNotEnded) {
                continue;
            }

            if (!firstName) firstName = name;
            migrations.push(migration);
            lastName = name;
        }

        return {migrations, firstName, lastName};
    }

    /**
     * Applies all migrations after `lastName`
     */
    migrateUp(db: Database, lastName?: string): FirstLastName {
        const {
            migrations,
            firstName,
            lastName: lastAppliedName
        } = this.getMigrations(lastName);

        for (const migration of migrations) {
            migration.up(db);
        }

        return {firstName, lastName: lastAppliedName};
    }

    /**
     * Removes all migrations between `from` (inclusive) until `target` (exclusive)
     */
    migrateDown(db: Database, from?: string, target?: string): FirstLastName {
        const {migrations, firstName, lastName} = this.getMigrations(
            target,
            from
        );
        migrations.reverse();

        for (const migration of migrations) {
            migration.down(db);
        }

        return {firstName, lastName};
    }
}

class Statements {
    hasTable = () =>
        this.db
            .prepare<string>(
                `SELECT count(name) FROM sqlite_master
            WHERE type='table' AND name=?`
            )
            .bind(this.tableName) as Statement;
    readonly createTable = () =>
        this.db.prepare(`
        CREATE TABLE ${this.tableName} (
            name TEXT NOT NULL
        )
    `);
    readonly getLatestMigration = () =>
        this.db.prepare(`
        SELECT name FROM ${this.tableName}
        LIMIT 1
    `);
    readonly hasRow = () =>
        this.db.prepare(`
        SELECT count(name) FROM ${this.tableName}
    `);
    readonly deleteRow = () =>
        this.db.prepare(`
        DELETE FROM ${this.tableName}
    `);
    readonly updateRow = () =>
        this.db.prepare<string>(`
        UPDATE ${this.tableName}
        SET name = ?
    `);
    readonly insertRow = () =>
        this.db.prepare<string>(`
        INSERT INTO ${this.tableName} (name)
        VALUES (?)
    `);

    constructor(
        private readonly db: Database,
        private readonly tableName: string
    ) {}
}

export default class MigrationManager {
    private readonly s: Statements;
    private initialised = false;

    constructor(
        private db: Database,
        private migrations: MigrationList,
        private tableName = "latestMigration"
    ) {
        if (/[^a-zA-Z0-9_-]/g.test(tableName))
            throw new Error("Invalid table name");
        this.s = new Statements(db, tableName);
    }

    /**
     * Runs migrations to get to the latest version
     */
    migrate() {
        const last = this.getLatestMigration();
        const {lastName} = this.migrations.migrateUp(this.db, last);
        if (lastName) this.setLatestMigration(lastName);
    }

    /**
     * Reverts migrations, leaving `target` as the last migration
     * @param target - Name of target migration, empty to revert all migrations
     */
    revert(target?: string) {
        const latest = this.getLatestMigration();
        this.migrations.migrateDown(this.db, latest, target);
    }

    private initialise() {
        if (this.initialised) return;

        if (this.s.hasTable().get() > 0) {
            // table already exists
            this.initialised = true;
            return;
        }

        this.initialised = true;
        try {
            this.s.createTable().run();
        } catch {
            this.initialised = false;
        }
    }

    private getLatestMigration(): string {
        this.initialise();
        return this.s.getLatestMigration().get()?.name;
    }

    private setLatestMigration(name: string) {
        this.initialise();

        const rowExists = this.s.hasRow().get() > 0;

        if (rowExists) {
            if (!name) {
                this.s.deleteRow().run();
            } else {
                this.s.updateRow().run(name);
            }
        } else {
            if (name) {
                this.s.insertRow().run(name);
            }
        }
    }
}
