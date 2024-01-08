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

    child(name: string): Logger;
}

class LoggerImpl implements Logger {
    trace = this.createLogFn("trace", 40, "[90m");
    debug = this.createLogFn("debug", 30, "[34m");
    info = this.createLogFn("info ", 20, "[32m");
    warn = this.createLogFn("warn ", 10, "[33m");
    fatal = this.createLogFn("fatal", 0, "[31m");

    constructor(private name: string) {}

    child(name: string) {
        return new LoggerImpl(`${this.name}:${name}`);
    }

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
        } else if (typeof Buffer !== "undefined" && context instanceof Buffer) {
            const bufferString = context.subarray(0, 16).toString("hex");
            const bufferStringSpaced = bufferString
                .split("")
                .map((c, i) => (i % 2 === 1 ? c + " " : c))
                .join("")
                .trim();
            const ellipsis = context.length > 16 ? "..." : "";
            return `Buffer(${context.length}) { ${bufferStringSpaced} ${ellipsis} }`;
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

    private createLogFn(level: string, index: number, ansiCode: string): LogFunction {
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

            const formattedTime = performance.now().toFixed(3).padStart(7, "0");

            const fullMessage = `${formattedTime} [${level}] ${this.name}: ${formattedString}${contextString}`;

            // @ts-expect-error Window *is* defined, sometimes
            if (typeof window === "undefined") {
                console.log(`\x1b${ansiCode}${fullMessage}\x1b[0m`);
            } else {
                console.log(fullMessage);
            }
        };
    }

    private isLogLevelEnabled(index: number) {
        const logLevelEnvVar =
            typeof process !== "undefined" ? process.env.LOG_LEVEL : undefined;
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
