import {prisma} from "../../prisma.ts";
import {procedure} from "../../trpc.ts";

export interface TrackItem {
    id: number;
    name: string;
    duration: number;
    artists: {
        id: number;
        name: string;
    }[];
    album: {
        id: number;
        name: string;
    } | null;
    artwork: {
        id: number;
        avgColour: string;
    } | null;
}

export const list = procedure.query(async () => {
    const data = await prisma.track.findMany({
        orderBy: {
            sortableName: "asc"
        },
        select: {
            id: true,
            name: true,
            sources: {
                take: 1,
                select: {
                    duration: true
                }
            },
            artists: {
                select: {
                    id: true,
                    name: true
                }
            },
            albums: {
                take: 1,
                select: {
                    id: true,
                    name: true
                }
            },
            artworks: {
                take: 1,
                select: {
                    id: true,
                    avgColour: true
                }
            }
        }
    });

    return data.map<TrackItem>(track => ({
        id: track.id,
        name: track.name,
        duration: track.sources[0].duration,
        artists: track.artists.map(artist => ({
            id: artist.id,
            name: artist.name
        })),
        album: track.albums.length > 0 ? track.albums[0] : null,
        artwork: track.artworks.length > 0 ? track.artworks[0] : null
    }));
});
