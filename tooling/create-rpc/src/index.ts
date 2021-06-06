#!/usr/bin/env node

import {writeFile, mkdir} from "fs/promises";
import {resolve} from "path";
import {Command, Option} from "commander";
import {cosmiconfig} from "cosmiconfig";
import {version} from "../package.json";
import {joinCamel, joinDashed, split} from "./word-joining";

// TODO: Launch Nano or another editor to create parameters and interfaces

interface Configuration {
    directory?: string;
    ipc?: string;
    windowIds?: string;
}

enum Direction {
    nodeCallsApp,
    appCallsNode
}

function parseGenerationDirection(
    direction: "n2a" | "a2n" | "node-calls-app" | "app-calls-node"
) {
    switch (direction) {
        case "n2a":
        case "node-calls-app":
            return Direction.nodeCallsApp;
        case "a2n":
        case "app-calls-node":
            return Direction.appCallsNode;
    }
}

function generateHandle(
    module: string,
    methodName: string,
    generateRequest: boolean
): string {
    return `import {handle} from "${module}";
import {event, ${generateRequest ? "Request, " : ""}Response} from "./common";

export default function ${methodName}(cb: (${
        generateRequest ? "req: Request" : ""
    }) => Promise<Response>): void {
    handle(event, cb);
}`;
}

(async () => {
    const explorer = cosmiconfig("create-rpc");
    const result = await explorer.search();
    const config: Configuration = result?.config ?? {};

    const program = new Command();

    program
        .version(version)
        .arguments("<name>")
        .requiredOption(
            "-o, --directory <value>",
            "output directory (config.directory)",
            config.directory
        )
        .option(
            "-i, --ipc <value>",
            "ipc module (config.ipc)",
            config.ipc ?? "@muzik/electron-ipc"
        )
        .requiredOption(
            "-w, --window-ids <value>",
            "window ids module, export {Target} enum (config.windowIds)",
            config.windowIds
        )
        .option("-m, --main-window <value>", "main window id enum key", "main")
        .option("-r, --request", "generate request interface", false)
        .addOption(
            new Option("-d, --direction <value>", "call direction")
                .choices(["n2a", "a2n", "node-calls-app", "app-calls-node"])
                .makeOptionMandatory(true)
        );

    program.parse();

    const options = program.opts();
    const [name] = program.args;

    const outputDirectory: string = options.directory;
    const ipcModule: string = options.ipc;
    const windowIdModule: string = options.windowIds;
    const mainWindowEnumKey: string = options.mainWindow;
    const generateRequestInterface: boolean = options.request;

    const generationDirection = parseGenerationDirection(options.direction);
    console.log(
        "Generating code using",
        Direction[generationDirection],
        "template"
    );

    const nameSplit = split(name);

    const eventName = joinDashed(nameSplit);
    const callMethodName = joinCamel(nameSplit);
    const handleMethodName = joinCamel(["handle", ...nameSplit]);

    const directory = resolve(outputDirectory, eventName);
    const commonFileName = resolve(directory, "common.ts");
    const appFileName = resolve(directory, "app.ts");
    const nodeFileName = resolve(directory, "node.ts");

    switch (generationDirection) {
        case Direction.nodeCallsApp:
            console.log(
                `This means that the Node code will have a \`${callMethodName}\` method, and the app will have a \`${handleMethodName}\` method.`
            );
            break;
        case Direction.appCallsNode:
            console.log(
                `This means that the Node code will have a \`${handleMethodName}\` method, and the app will have a \`${callMethodName}\` method.`
            );
            break;
    }

    console.log(`Using the event name \`${eventName}\`.`);

    console.log("Outputting to:");
    console.log("Common:", commonFileName);
    console.log("App:   ", appFileName);
    console.log("Node:  ", nodeFileName);

    // language=TypeScript
    const commonFile = `import {g} from "${ipcModule}/common";

export interface Response {
    /* Serialisable response data type */
}${
        generateRequestInterface
            ? `

export interface Request {
    /* Serialisable request data type */
}`
            : ""
    }

export const event = g<Response${
        generateRequestInterface ? ", Request" : ""
    }>("${eventName}");`;

    const appFile =
        generationDirection === Direction.appCallsNode
            ? `import {invoke} from "${ipcModule}/renderer";
import {event, ${
                  generateRequestInterface ? "Request, " : ""
              }Response} from "./common";

export default function ${callMethodName}(${
                  generateRequestInterface ? "req: Request" : ""
              }): Promise<Response> {
    return invoke(event${generateRequestInterface ? ", req" : ""});
}`
            : generateHandle(
                  ipcModule + "/renderer",
                  handleMethodName,
                  generateRequestInterface
              );

    const nodeFile =
        generationDirection === Direction.appCallsNode
            ? generateHandle(
                  ipcModule + "/main",
                  handleMethodName,
                  generateRequestInterface
              )
            : `import {invoke} from "${ipcModule}/main";
import {Target} from "${windowIdModule}";
import {event, ${
                  generateRequestInterface ? "Request, " : ""
              }Response} from "./common";

export default function ${callMethodName}(${
                  generateRequestInterface ? "req: Request, " : ""
              }target = Target.${mainWindowEnumKey}): Promise<Response> {
    return invoke(target)(event${generateRequestInterface ? ", req" : ""});
}`;

    await mkdir(directory, {recursive: true});
    await writeFile(commonFileName, commonFile);
    await writeFile(appFileName, appFile);
    await writeFile(nodeFileName, nodeFile);

    console.log("Bootstrap complete!");
})();
