import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {ipcLink} from "electron-trpc/renderer";
import {ReactElement, ReactNode} from "react";
import superjson from "superjson";
import {trpc} from "../utils/trpc";

const queryClient = new QueryClient();

const trpcClient = trpc.createClient({
    links: [ipcLink()],
    transformer: superjson
});

export interface TrpcProviderProps {
    children: ReactNode;
}

export function TrpcProvider({children}: TrpcProviderProps): ReactElement {
    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </trpc.Provider>
    );
}