import {readdir, readFile, stat} from "fs/promises";
import {join} from "path";
import {sql} from "kysely";
import {childLogger} from "../../../shared/logger.ts";
import {db} from "../db.ts";

const log = childLogger("init:migrations");

const MIGRATIONS_TABLE_NAME: string = "_migrations";

// From https://github.com/prisma/prisma/issues/2868#issuecomment-650283841
function splitSqlStatements(sql: string) {
    return sql
        .trim()
        .split("\n")
        .filter(line => line.indexOf("--") !== 0)
        .join("\n")
        .replace(/\r\n|\r|\n/gm, " ") // remove newlines
        .replace(/\s+/g, " ") // excess whitespace
        .split(";")
        .filter(Boolean);
}

export async function migrateDatabase() {
    try {
        const hasMigrationsTable = await db.introspection.getTables().then(tables => tables.some(table => table.name === MIGRATIONS_TABLE_NAME));

        if (hasMigrationsTable) {
            log.debug("Migrations table already exists");
        } else {
            log.debug("Creating migrations table");
            await db.schema.createTable("_migrations")
                .addColumn("migration_name", "text", col => col.notNull().primaryKey())
                .execute();
        }

        // @ts-expect-error Table does not exist in schema
        const appliedMigrations = await db.selectFrom(MIGRATIONS_TABLE_NAME)
            .selectAll()
            .execute() as {migration_name: string}[];

        const appliedMigrationNames = new Set(
            appliedMigrations.map(migration => migration.migration_name)
        );

        const migrationsDirectory = join(__dirname, "./migrations");
        const allMigrationNames = await readdir(migrationsDirectory)
            .then(res => res.filter(migrationName => !migrationName.startsWith(".") && migrationName !== "migration_lock.toml"));

        const migrationsToApply = allMigrationNames
            .filter(migrationName => !appliedMigrationNames.has(migrationName))
            .sort();

        if (migrationsToApply.length > 0) {
            log.info(
                migrationsToApply,
                "Applying %s migrations",
                migrationsToApply.length
            );

            for (const migrationName of migrationsToApply) {
                const migrationStat = await stat(
                    join(migrationsDirectory, migrationName)
                );
                if (!migrationStat.isDirectory()) continue;

                log.debug("Applying migration %s", migrationName);

                const migrationSource = await readFile(
                    join(migrationsDirectory, migrationName, "migration.sql"),
                    "utf8"
                );

                const statements = [
                    ...splitSqlStatements(migrationSource),
                    `INSERT INTO "${MIGRATIONS_TABLE_NAME}"
                     VALUES ('${migrationName}');`
                ];

                for (const statement of statements) {
                    await sql.raw(statement).execute(db);
                }
            }
        } else {
            log.info("No migrations to apply");
        }
    } catch (err) {
        log.fatal(err, "Failed to migrate database");
        await db.destroy();

        // TODO: show a dialogue or something
        process.exit(1);
    }
}
