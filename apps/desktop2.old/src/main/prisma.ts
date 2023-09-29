import {PrismaClient} from "@muzik/db";
import {app} from "electron";
import {log} from "./utils/logger.ts";

export const dbPath = app.getPath("userData") + "/db.sqlite";
log.info("Using database at %s", dbPath);

export const prisma = new PrismaClient({
    datasources: {
        db: {
            url: `file:${dbPath}`
        }
    }
});
