import {Database} from "@muzik/database";
import {log} from "./logger";
import {getSongFiles} from "./getSongFiles";
import {getSongInfo, SongInfo} from "./getSongInfo";
import {getAlbumArt} from "./getAlbumArt";

function getAlbumKey(albumName: string, artistName: string) {
    return artistName.replace(/:/g, "[:]") + ":" + albumName;
}

export default async function scan(db: Database, dir: string): Promise<void> {
    log.debug("Searching for songs in %s", dir);
    const supportedSongs = await getSongFiles(dir);

    log.debug("Loading id3 data");
    const songInfos = await getSongInfo(supportedSongs);

    log.debug("Searching for album art");
    const albumSongs = new Map<string, SongInfo[]>();
    const albumArts = new Map<string, string | null>();

    log.trace("Grouping songs into albums");
    for (const songInfo of songInfos) {
        const albumKey = getAlbumKey(songInfo.album, songInfo.artist);

        if (albumSongs.has(albumKey)) {
            albumSongs.get(albumKey)?.push(songInfo);
        } else {
            albumSongs.set(albumKey, [songInfo]);
        }
    }

    log.trace("Locating art per album");
    for (const [albumKey, songs] of albumSongs) {
        const art = await getAlbumArt(songs);
        albumArts.set(albumKey, art);
    }

    log.debug("Writing data");
    const artistIdMapping = new Map<string, number>();
    const albumIdMapping = new Map<string, number>();

    for (const songInfo of songInfos) {
        const {artist, album, ...song} = songInfo;
        const albumKey = getAlbumKey(album, artist);

        if (!artistIdMapping.has(artist)) {
            log.trace("Creating artist %s", artist);
            const dbArtist = await db.addArtist(artist);
            artistIdMapping.set(artist, dbArtist.id);
        }

        const artistId = artistIdMapping.get(artist) as number;

        if (!albumIdMapping.has(albumKey)) {
            log.trace("Creating album %s for artist %s", album, artist);
            const art = albumArts.get(albumKey) ?? null;
            const dbAlbum = await db.addAlbum(album, art, artistId);
            albumIdMapping.set(albumKey, dbAlbum.id);
        }

        const albumId = albumIdMapping.get(albumKey) as number;

        await db.addSong(song, albumId);
    }
}
