import {Database} from "@muzik/database";
import {log} from "./logger";
import {getSongFiles} from "./getSongFiles";
import {getSongInfo, SongInfo} from "./getSongInfo";
import {AlbumArt, getAlbumArt} from "./getAlbumArt";
import {getExtraSongInfo, setupExtraSongInfo} from "./getExtraSongInfo";

function getAlbumKey(albumName: string, artistName: string) {
    return artistName.replace(/:/g, "[:]") + ":" + albumName;
}

export default async function scan(
    db: Database,
    dir: string,
    progress: (percentage: number) => void
): Promise<void> {
    progress(0);

    const ONE_THIRD = 100 / 3;

    log.debug("Searching for songs in %s", dir);
    progress(0);
    const supportedSongs = await getSongFiles(dir);

    log.debug("Loading id3 data");
    const songInfos = await getSongInfo(supportedSongs, prog =>
        progress(prog * ONE_THIRD)
    );

    const songCount = songInfos.length;

    log.debug("Searching for album art");
    const albumSongs = new Map<string, SongInfo[]>();
    const albumArts = new Map<string, AlbumArt | null>();

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
    let currentSongIndex = 0;
    for (const [albumKey, songs] of albumSongs) {
        const art = await getAlbumArt(songs);
        albumArts.set(albumKey, art);

        currentSongIndex++;
        progress(ONE_THIRD + (currentSongIndex / songCount) * ONE_THIRD);
    }

    log.debug("Setting up extra info getter");
    const extraInit = await setupExtraSongInfo();

    log.debug("Writing data");
    const artistIdMapping = new Map<string, number>();
    const albumIdMapping = new Map<string, number>();

    currentSongIndex = 0;
    for (const songInfo of songInfos) {
        const {artist, album, ...song} = songInfo;
        const albumKey = getAlbumKey(album, artist);

        if (!artistIdMapping.has(artist)) {
            if (await db.hasArtist(artist)) {
                log.trace("Loading artist %s", artist);
                artistIdMapping.set(artist, db.getArtistId(artist));
            } else {
                log.trace("Creating artist %s", artist);
                const dbArtist = await db.addArtist(artist);
                artistIdMapping.set(artist, dbArtist.id);
            }
        }

        const artistId = artistIdMapping.get(artist) as number;

        if (!albumIdMapping.has(albumKey)) {
            if (await db.hasAlbum(album, artistId)) {
                log.trace("Loading album %s", album);
                albumIdMapping.set(albumKey, db.getAlbumId(album, artistId));
            } else {
                log.trace("Creating album %s for artist %s", album, artist);
                const art = albumArts.get(albumKey) ?? null;
                const dbAlbum = await db.addAlbum(album, art, artistId);
                albumIdMapping.set(albumKey, dbAlbum.id);
            }
        }

        const albumId = albumIdMapping.get(albumKey) as number;

        if (await db.hasSong(song.name, albumId)) {
            log.trace("Skipping song that already exists (%s)", song.name);
        } else {
            const extraInfo = await getExtraSongInfo(extraInit, song.path);
            await db.addSong({...song, ...extraInfo}, albumId);
        }

        currentSongIndex++;
        progress(ONE_THIRD * 2 + (currentSongIndex / songCount) * ONE_THIRD);
    }
}
