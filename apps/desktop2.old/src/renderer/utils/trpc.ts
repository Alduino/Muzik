import {createTRPCReact} from "@trpc/react-query";
import type {AppRouter} from "../../main/router";

export const trpc = createTRPCReact<AppRouter>();
