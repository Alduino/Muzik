import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable
} from "@tanstack/react-table";
import {Fragment, ReactElement} from "react";
import {formatDuration} from "../../../../desktop/src/app/utils/formatDuration.tsx";
import {TrackItem} from "../../../electron/main/router/tracks/list.ts";
import {Artwork} from "../../components/artwork";
import {trpc} from "../../utils/trpc.ts";
import {
    containerClass,
    tableClass,
    tableHeaderClass,
    tableCellClass,
    commaClass,
    cellLinkClass
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
        cell: info => <div>{info.getValue()}</div>
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
                            <a className={cellLinkClass} href="#">
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
        cell: info => <div>{info.getValue()?.name}</div>
    }),
    columnHelper.accessor("duration", {
        header: "Time",
        cell: info => <div>{formatDuration(info.getValue())}</div>
    })
];

export function Component(): ReactElement {
    const tracks = trpc.tracks.list.useInfiniteQuery(
        {},
        {
            getNextPageParam: lastPage => lastPage.nextCursor
        }
    );

    const table = useReactTable({
        data: tracks.data?.pages.flatMap(page => page.items) ?? [],
        columns,
        getCoreRowModel: getCoreRowModel()
    });

    return (
        <div className={containerClass}>
            <table className={tableClass}>
                <thead>
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                                <th
                                    key={header.id}
                                    className={tableHeaderClass}
                                >
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                              header.column.columnDef.header,
                                              header.getContext()
                                          )}
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody>
                    {table.getRowModel().rows.map(row => (
                        <tr key={row.id}>
                            {row.getVisibleCells().map(cell => (
                                <td key={cell.id}>
                                    <div className={tableCellClass}>
                                        {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext()
                                        )}
                                    </div>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
