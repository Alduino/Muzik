import {Locator} from "@muzik/config-loader";
import {name as packageName} from "../package.json";

export const configLocator = new Locator(packageName);
