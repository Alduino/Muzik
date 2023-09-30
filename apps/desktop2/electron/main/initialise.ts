import {readdir, readFile, stat} from "fs/promises";
import {join} from "path";
import {prisma} from "./prisma.ts";
import {registerCustomProtocols} from "./protocols";
import {markInitialisationComplete} from "./router/meta/init.ts";
import {configDb} from "./utils/config.ts";
import {initialiseFfmpeg} from "./utils/ffmpeg.ts";
import {log} from "./utils/logger.ts";

const PRISMA_MIGRATIONS_TABLE_CREATE_SQL = `
    CREATE TABLE "_prisma_migrations"
    (
        "migration_name" TEXT NOT NULL,
        PRIMARY KEY ("migration_name")
    );
`;

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

async function migrateDatabase() {
    try {
        const hasMigrationsTable = await prisma.$queryRaw<unknown[]>`SELECT name
          FROM sqlite_master
          WHERE type = 'table'
            AND name = '_prisma_migrations'`;

        if (hasMigrationsTable.length === 0) {
            log.debug("Creating migrations table");
            await prisma.$executeRawUnsafe(PRISMA_MIGRATIONS_TABLE_CREATE_SQL);
        } else {
            log.debug("Migrations table already exists");
        }

        const appliedMigrations = await prisma.$queryRaw<
            {
                migration_name: string;
            }[]
        >`SELECT migration_name
          FROM "_prisma_migrations"`;

        const appliedMigrationNames = new Set(
            appliedMigrations.map(migration => migration.migration_name)
        );

        const migrationsDirectory = join(__dirname, "./migrations");
        const allMigrationNames = await readdir(migrationsDirectory);

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
                    `INSERT INTO "_prisma_migrations" VALUES ('${migrationName}');`
                ];

                for (const statement of statements) {
                    log.trace({statement}, "Executing statement");

                    try {
                        await prisma.$executeRawUnsafe(statement);
                    } catch (err) {
                        if (
                            err instanceof Error &&
                            err.message.includes("Execute returned results")
                        ) {
                            await prisma.$queryRawUnsafe(statement);
                        } else throw err;
                    }
                }
            }
        } else {
            log.info("No migrations to apply");
        }
    } catch (err) {
        log.fatal(err, "Failed to migrate database");

        await prisma.$disconnect();

        // TODO: show a dialogue or something
        process.exit(1);
    }
}

export async function initialiseMuzik() {
    registerCustomProtocols();
    await configDb.read();
    await migrateDatabase();
    await initialiseFfmpeg();
    markInitialisationComplete();
}
