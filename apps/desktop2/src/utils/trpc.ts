import {createTRPCReact} from "@trpc/react-query";
import type {AppRouter} from "../../electron/main/router";

export const trpc = createTRPCReact<AppRouter>();
