import {join} from "path";
import {app} from "electron";
import {Low} from "lowdb";
import {JSONFile} from "lowdb/node";

interface Configuration {
    sourceDirectories: string[];
}

const defaultData: Configuration = {
    sourceDirectories: []
};

const path = join(app.getPath("appData"), "config.json");

const adapter = new JSONFile<Configuration>(path);

export const configDb = new Low(adapter, defaultData);
