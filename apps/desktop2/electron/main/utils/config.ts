import {join} from "path";
import {app} from "electron";
import {Low} from "lowdb";
import {JSONFile} from "lowdb/node";

interface Configuration {
    ffPaths: {
        mpeg: string;
        probe: string;
    } | null;

    sourceDirectories: string[];
}

const defaultData: Configuration = {
    ffPaths: null,
    sourceDirectories: []
};

const path = join(app.getPath("userData"), "config.json");

const adapter = new JSONFile<Configuration>(path);

export const configDb = new Low(adapter, defaultData);
