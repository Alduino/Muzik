import {createServer} from "http";
import EventEmitter from "events";
import {Plugin} from "rollup";

const VIRTUAL_MODULE_ID = "\0autoreload:configuration";

export interface AutoreloadOptions {
    port?: number;
    server?: boolean;
}

export default function autoreload({
    port = 7117,
    server = true
}: AutoreloadOptions = {}): Plugin {
    const events = new EventEmitter();

    if (server) {
        const httpServer = createServer((req, res) => {
            if (req.url !== "/sse") {
                res.writeHead(404);
                res.write("/sse");
                res.end();
                return;
            }

            console.log("Page loaded from", req.connection.address());

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Connection", "keep-alive");
            res.setHeader("Cache-Control", "no-cache");
            res.writeHead(200);

            res.write("event: hello\ndata: null\n\n");

            function handle() {
                res.write("event: trigger\ndata: null\n\n");
            }

            events.on("trigger", handle);

            req.on("close", () => {
                console.log("Client disconnected");
                events.off("trigger", handle);
            });
        });

        httpServer.listen(port, () =>
            console.debug(`Autoreload server is listening at ${host}`)
        );
    }

    const host = `http://localhost:${port}/sse`;

    // language=js
    const virtualModuleSource = `
        export const host = ${JSON.stringify(host)};
    `;

    return {
        name: "autoreload",

        resolveId(id) {
            if (id === VIRTUAL_MODULE_ID) return id;
            return null;
        },

        load(id) {
            if (id !== VIRTUAL_MODULE_ID) return null;

            return virtualModuleSource;
        },

        writeBundle() {
            setTimeout(() => {
                events.emit("trigger");
            }, 500);
        }
    };
}
