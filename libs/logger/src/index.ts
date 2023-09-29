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
    trace = this.createLogFn("trace", 40);
    debug = this.createLogFn("debug", 30);
    info = this.createLogFn("info ", 20);
    warn = this.createLogFn("warn ", 10);
    fatal = this.createLogFn("fatal", 0);

    constructor(private name: string) {}

    private static formatInnerContext(context: unknown): string {
        if (typeof context === "undefined") return "undefined";
        if (context === null) return "null";

        if (context instanceof Error) {
            return `Error {
${context
    .stack!.split("\n")
    .map(l => "  " + l)
    .join("\n")}
}`;
        } else if (Array.isArray(context)) {
            return `[ ${context
                .map(c => this.formatInnerContext(c))
                .join(", ")} ]`;
        } else if (typeof context === "object") {
            return `{ ${Object.entries(context)
                .map(
                    ([key, value]) => `${key}=${this.formatInnerContext(value)}`
                )
                .join(", ")} }`;
        } else {
            return JSON.stringify(context);
        }
    }

    private static formatContext(context: unknown) {
        if (typeof context === "undefined") return "";

        if (context instanceof Error) {
            return `\n${context.message}\n${context.stack}`;
        } else {
            return (
                ": " +
                Object.entries(context as Record<string, unknown>)
                    .map(
                        ([key, value]) =>
                            `${key}=${this.formatInnerContext(value)}`
                    )
                    .join(", ")
            );
        }
    }

    private createLogFn(level: string, index: number): LogFunction {
        if (!this.isLogLevelEnabled(index)) {
            return () => {
                /* noop */
            };
        }

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

    private isLogLevelEnabled(index: number) {
        const logLevelEnvVar = process.env.LOG_LEVEL;
        if (logLevelEnvVar === undefined) return true;

        const logLevel = parseInt(logLevelEnvVar, 10);
        if (Number.isNaN(logLevel)) return true;

        return index <= logLevel;
    }
}

// TODO remove isApp
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function createLogger(name: string, isApp = false): Logger {
    return new LoggerImpl(name);
}
