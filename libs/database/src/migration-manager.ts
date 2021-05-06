import {Knex} from "knex";

export interface Migration {
    up(knex: Knex): PromiseLike<void>;
    down(knex: Knex): PromiseLike<void>;
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
    async migrateUp(knex: Knex, lastName?: string): Promise<FirstLastName> {
        const {
            migrations,
            firstName,
            lastName: lastAppliedName
        } = this.getMigrations(lastName);

        for (const migration of migrations) {
            await migration.up(knex);
        }

        return {firstName, lastName: lastAppliedName};
    }

    /**
     * Removes all migrations between `from` (inclusive) until `target` (exclusive)
     */
    async migrateDown(
        knex: Knex,
        from?: string,
        target?: string
    ): Promise<FirstLastName> {
        const {migrations, firstName, lastName} = this.getMigrations(
            target,
            from
        );
        migrations.reverse();

        for (const migration of migrations) {
            await migration.down(knex);
        }

        return {firstName, lastName};
    }
}

interface MigrationInfo {
    name: string;
}

export default class MigrationManager {
    private initialised = false;

    constructor(
        private knex: Knex,
        private migrations: MigrationList,
        private tableName = "latestMigration"
    ) {}

    private async initialise() {
        if (this.initialised) return;
        if (await this.knex.schema.hasTable(this.tableName)) return;
        this.initialised = true;

        try {
            await this.knex.schema.createTable(this.tableName, builder => {
                builder.string("name");
            });
        } catch {
            this.initialised = false;
        }
    }

    private async getLatestMigration() {
        await this.initialise();
        const row = await this.knex
            .select("name")
            .from<MigrationInfo>(this.tableName)
            .first();

        if (!row) return undefined;
        return row.name;
    }

    private async setLatestMigration(name: string) {
        await this.initialise();

        const rowExists = !!(await this.knex
            .table(this.tableName)
            .select("name")
            .first());

        if (rowExists) {
            if (!name) {
                await this.knex.table(this.tableName).delete();
            } else {
                await this.knex.table(this.tableName).update({name});
            }
        } else {
            if (name) {
                await this.knex.table(this.tableName).insert({name});
            }
        }
    }

    /**
     * Runs migrations to get to the latest version
     */
    async migrate() {
        const last = await this.getLatestMigration();
        const {lastName} = await this.migrations.migrateUp(this.knex, last);
        if (lastName) await this.setLatestMigration(lastName);
    }

    /**
     * Reverts migrations, leaving `target` as the last migration
     * @param target - Name of target migration, empty to revert all migrations
     */
    async revert(target?: string) {
        const latest = await this.getLatestMigration();
        await this.migrations.migrateDown(this.knex, latest, target);
    }
}
