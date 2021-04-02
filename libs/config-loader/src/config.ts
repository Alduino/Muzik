import {Locator} from "./locator";
import EventEmitter from "events";
import {parse} from "yaml";

// https://stackoverflow.com/a/51365037
type RecursivePartial<T> = {
    [P in keyof T]?: T[P] extends (infer U)[]
        ? RecursivePartial<U>[]
        : T[P] extends object
        ? RecursivePartial<T[P]>
        : T[P];
};

export default class ConfigFile extends EventEmitter {
    constructor(private name: string, private locator: Locator) {
        super();
    }

    read<T>(): RecursivePartial<T> {
        const path = this.locator.getFile(this.name + ".yaml");
        return parse(path);
    }
}
