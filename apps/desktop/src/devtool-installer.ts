/*!
 * Based on electron-devtools-installer
 * https://github.com/MarshallOfSound/electron-devtools-installer
 *
 * The MIT License (MIT)
 * Copyright (c) 2016 Samuel Attard
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import {createWriteStream, existsSync} from "fs";
import {mkdir, readdir, chmod, stat} from "fs/promises";
import {resolve} from "path";
import {app, net, session} from "electron";
import unzip from "unzip-crx-3";

export const DEVTOOL_REDUX = "lmhkpmbekcpmknklioeibfkpmmfibljd";
export const DEVTOOL_REACT = "fmkadmapgofadopljbjfkapdkoienihi";

function getRoot() {
    return resolve(app.getPath("userData"), "extensions");
}

function downloadFile(url: string, target: string) {
    return new Promise<void>((yay, nay) => {
        const req = net.request(url);

        req.on("response", res => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore Thinks pipe doesn't exist?
            res.pipe(createWriteStream(target)).on("close", yay);
            res.on("error", nay);
        });

        req.on("error", nay);
        req.end();
    });
}

async function setPerms(dir: string, mode: string | number) {
    const files = await readdir(dir);

    for (const file of files) {
        const path = resolve(dir, file);
        await chmod(path, parseInt(`${mode}`, 8));
        const stats = await stat(path);
        if (stats.isDirectory()) await setPerms(path, mode);
    }
}

async function downloadDevtool(id: string) {
    const root = getRoot();
    await mkdir(root, {recursive: true});

    const extensionDir = resolve(root, id);
    if (existsSync(extensionDir)) return extensionDir;

    const url = `https://clients2.google.com/service/update2/crx?response=redirect&acceptformat=crx2,crx3&x=id%3D${id}%26uc&prodversion=32`;
    const target = resolve(`${extensionDir}.crx`);

    console.debug("Downloading dev tool:", id);
    await downloadFile(url, target);
    await unzip(target);
    await setPerms(extensionDir, 755);

    return extensionDir;
}

export async function installDevtool(id: string): Promise<void> {
    if (process.env.NODE_ENV !== "development") return;

    // wait for a bit
    await new Promise(yay => setTimeout(yay, 1000));

    // then install
    const dir = await downloadDevtool(id);
    console.debug("Installing dev tool:", id);
    await session.defaultSession.loadExtension(dir);
}
