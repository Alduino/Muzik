import {printf} from "fast-printf";

type SprintfArg = string | number | boolean | null;

interface LogFunction {
    (context: unknown, message: string, ...args: SprintfArg[]): void;
    (message: string, ...args: SprintfArg[]): void;
}

export interface Logger {
    trace: LogFunction;
    debug: LogFunction;
    info: LogFunction;
    warn: LogFunction;
    fatal: LogFunction;
}

class LoggerImpl implements Logger {
    private static formatContext(context: unknown) {
        if (typeof context === "undefined") return "";

        if (context instanceof Error) {
            return `\n${context.message}\n${context.stack}`;
        } else {
            return (
                ": " +
                Object.entries(context as Record<string, unknown>)
                    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
                    .join(", ")
            );
        }
    }

    private createLogFn(level: string): LogFunction {
        return (contextOrMessage: unknown | string, ...args: SprintfArg[]) => {
            const context =
                typeof contextOrMessage === "string"
                    ? undefined
                    : contextOrMessage;
            const message =
                typeof contextOrMessage === "string"
                    ? contextOrMessage
                    : (args[0] as string);
            const rest =
                typeof contextOrMessage == "string" ? args : args.slice(1);

            const formattedString = printf(message, ...rest);
            const contextString = LoggerImpl.formatContext(context);

            console.log(
                `[${level}] ${this.name}: ${formattedString}${contextString}`
            );
        };
    }

    trace = this.createLogFn("trace");
    debug = this.createLogFn("debug");
    info = this.createLogFn("info");
    warn = this.createLogFn("warn");
    fatal = this.createLogFn("fatal");

    constructor(private name: string) {}
}

// TODO remove isApp
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function createLogger(name: string, isApp = false): Logger {
    return new LoggerImpl(name);
}
