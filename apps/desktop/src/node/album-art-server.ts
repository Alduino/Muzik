import {createServer} from "http";
import {createReadStream} from "fs";
import type {AddressInfo} from "net";
import {Album} from "@muzik/database";
import {getAlbumById} from "./database";
import {log} from "./logger";

export let hostname: string;

const artCache = new Map<number, Album | null>();

function getAlbum(id: number) {
    if (artCache.has(id)) return Promise.resolve(artCache.get(id));
    return getAlbumById(id, false);
}

const server = createServer(async (req, res) => {
    const id = parseInt(req.url.substring(1));
    const album = await getAlbum(id);

    if (!album) {
        res.statusCode = 404;
        res.write("album not found");
        res.end();
        return;
    }

    if (!album.art) {
        res.statusCode = 404;
        res.write("album does not have art");
        res.end();
        return;
    }

    const {path, mime} = album.art;

    res.setHeader("Content-Type", mime);
    res.writeHead(200);

    const fileStream = createReadStream(path);
    fileStream.pipe(res);
});

export function listen(): void {
    server.listen(0, "127.0.0.1", () => {
        const address = server.address() as AddressInfo;
        log.info(
            "Album art server listening at %s:%s",
            address.address,
            address.port
        );

        hostname = `http://${address.address}:${address.port}`;
    });
}
