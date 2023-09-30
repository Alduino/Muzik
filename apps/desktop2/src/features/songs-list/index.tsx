import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable
} from "@tanstack/react-table";
import clsx from "clsx";
import {Fragment, ReactElement} from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import {FixedSizeList} from "react-window";
import {formatDuration} from "../../../../desktop/src/app/utils/formatDuration.tsx";
import {TrackItem} from "../../../electron/main/router/tracks/list.ts";
import {Artwork} from "../../components/artwork";
import {trpc} from "../../utils/trpc.ts";
import {
    albumColumnClass,
    artistColumnClass,
    artworkColumnClass,
    cellLinkClass,
    commaClass,
    containerClass,
    tableCellClass,
    tableClass,
    tableHeaderClass,
    tableHeaderItemClass,
    tableRowClass,
    timeColumnClass,
    titleColumnClass
} from "./styles.css.ts";

const columnHelper = createColumnHelper<TrackItem>();

const columns = [
    columnHelper.display({
        id: "artwork",
        cell: info => {
            const {artwork} = info.row.original;
            if (!artwork) return null;

            return (
                <Artwork
                    id={artwork.id}
                    placeholderColour={artwork.avgColour}
                    size="small"
                />
            );
        }
    }),
    columnHelper.accessor("name", {
        header: "Title",
        cell: info => <span title={info.getValue()}>{info.getValue()}</span>
    }),
    columnHelper.display({
        id: "artists",
        header: "Artists",
        cell: info => {
            const {artists} = info.row.original;

            return (
                <>
                    {artists.map((artist, index) => (
                        <Fragment key={artist.id}>
                            {index !== 0 && <span className={commaClass} />}
                            <a
                                className={cellLinkClass}
                                href="#"
                                title={artist.name}
                            >
                                {artist.name}
                            </a>
                        </Fragment>
                    ))}
                </>
            );
        }
    }),
    columnHelper.accessor("album", {
        header: "Album",
        cell: info => (
            <span title={info.getValue()?.name}>{info.getValue()?.name}</span>
        )
    }),
    columnHelper.accessor("duration", {
        header: "Time",
        cell: info => <span>{formatDuration(info.getValue())}</span>
    })
];

const COLUMN_CLASSES = {
    artwork: artworkColumnClass,
    name: titleColumnClass,
    artists: artistColumnClass,
    album: albumColumnClass,
    duration: timeColumnClass
} as Record<string, string>;

export function Component(): ReactElement {
    const tracks = trpc.tracks.list.useQuery(undefined);

    const table = useReactTable({
        data: tracks.data ?? [],
        columns,
        getCoreRowModel: getCoreRowModel()
    });

    return (
        <div className={containerClass}>
            <div className={tableClass}>
                <div className={tableClass}>
                    <div>
                        {table.getHeaderGroups().map(headerGroup => (
                            <div
                                key={headerGroup.id}
                                className={tableHeaderClass}
                            >
                                {headerGroup.headers.map(header => (
                                    <div
                                        key={header.id}
                                        className={clsx(
                                            tableHeaderItemClass,
                                            COLUMN_CLASSES[header.id]
                                        )}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                  header.column.columnDef
                                                      .header,
                                                  header.getContext()
                                              )}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                    <AutoSizer>
                        {({width, height}) => (
                            <FixedSizeList
                                width={width}
                                height={height}
                                itemCount={tracks.data?.length ?? 0}
                                itemSize={52}
                            >
                                {({index, style}) => {
                                    const row = table.getRowModel().rows[index];

                                    return (
                                        <div
                                            key={row.id}
                                            className={tableRowClass}
                                            style={style}
                                        >
                                            {row.getVisibleCells().map(cell => (
                                                <div
                                                    key={cell.id}
                                                    className={clsx(
                                                        tableCellClass,
                                                        COLUMN_CLASSES[
                                                            cell.column.id
                                                        ]
                                                    )}
                                                >
                                                    {flexRender(
                                                        cell.column.columnDef
                                                            .cell,
                                                        cell.getContext()
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                }}
                            </FixedSizeList>
                        )}
                    </AutoSizer>
                </div>
            </div>
        </div>
    );
}

/*
table.getRowModel().rows.map(row => {
                            return (
                                <div key={row.id} className={tableRowClass}>
                                    {row.getVisibleCells().map(cell => (
                                        <div
                                            key={cell.id}
                                            className={clsx(
                                                tableCellClass,
                                                COLUMN_CLASSES[cell.column.id]
                                            )}
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </div>
                                    ))}
                                </div>
                            );
                        })
 */
