import {Database, SqlValue} from "sql.js";
import {log} from "../logger";

export default abstract class Table {
    constructor(protected db: Database) {}

    protected run<T>(query: TemplateStringsArray, ...params: SqlValue[]): T {
        const paramKeys = params.map((_, i) => `param_${i}`);

        const queryResult: string[] = [];

        for (let i = 0; i < query.length; i++) {
            const queryPart = query[i];

            queryResult.push(queryPart);
            if (i < paramKeys.length) queryResult.push(paramKeys[i]);
        }

        const queryString = queryResult.join("");
        log.trace("Running query: %s", queryString);

        const statement = this.db.prepare(queryString);
        const result = statement.getAsObject(params);
        statement.free();

        return (result as unknown) as T;
    }

    abstract initialise(): void;
}
