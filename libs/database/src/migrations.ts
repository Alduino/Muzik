import {MigrationList} from "./migration-manager";
import initial from "./migrations/initial";

const migrations = new MigrationList();

migrations.add("initial", initial);

export default migrations;
