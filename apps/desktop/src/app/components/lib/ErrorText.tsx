import {Code, HStack, Icon, Link, Square, Stack, Text} from "@chakra-ui/react";
import React, {ReactElement} from "react";
import {BiError} from "react-icons/bi";

export interface ErrorTextProps {
    error: Error;
}

interface StackLineProps {
    modifier?: string;
    names?: string;
    url: string;
    lineNo?: number;
    lineOffset?: number;
}

const stackTraceFormat = /^(?:(?<names>[^(]+)\()?(?<url>[^:]+)(?::(?<lineNo>\d+))?(?::(?<lineOffset>\d+))?\)?$/;
function parseStackLine(line: string): StackLineProps {
    const match = line.match(stackTraceFormat);
    if (!match) throw new Error(`Failed to match stack line, '${line}'`);
    const {modifier, names, url, lineNo, lineOffset} = match.groups || {};
    return {
        modifier: modifier?.trim(),
        names: names?.trim(),
        url: url?.trim(),
        lineNo: typeof lineNo === "undefined" ? undefined : parseInt(lineNo),
        lineOffset:
            typeof lineOffset === "undefined" ? undefined : parseInt(lineOffset)
    };
}

const StackLine = ({
    modifier,
    names,
    url,
    lineNo,
    lineOffset
}: StackLineProps) => (
    <HStack>
        <Text opacity={0.5}>at</Text>
        {modifier && <Text color="blue.200">{modifier}*</Text>}
        {names && <Text color="green.200">{names}</Text>}
        <Text color="blue.500">
            ({url}
            {lineNo && `:${lineNo}`}
            {lineOffset && `:${lineOffset}`})
        </Text>
    </HStack>
);

export const ErrorText = (props: ErrorTextProps): ReactElement => {
    if (process.env.NODE_ENV !== "production") {
        const stack =
            props.error.stack
                ?.split("\n")
                .slice(1)
                .map(line => line.trim().substring("at ".length))
                .filter(line => line)
                .map(line => parseStackLine(line))
                .filter(line => line) ?? [];

        return (
            <Stack spacing={0}>
                <HStack color="white" bg="red.800" p={2} borderTopRadius="sm">
                    <Icon as={BiError} flexShrink={0} />
                    <Text>
                        {props.error.name}: {props.error.message}
                    </Text>
                </HStack>
                <Code
                    as="pre"
                    p={2}
                    borderTopRadius={0}
                    overflowX="auto"
                    bg="gray.800"
                >
                    {stack.length > 0 ? (
                        stack.map((line, i) => <StackLine {...line} key={i} />)
                    ) : (
                        <Text>(Empty stack trace)</Text>
                    )}
                </Code>
            </Stack>
        );
    } else {
        return (
            <HStack>
                <Square size={8} bg="orange.700" borderRadius="sm">
                    <Icon as={BiError} color="white" />
                </Square>
                <Text>
                    Something went wrong. Please{" "}
                    <Link href="https://gitlab.com/alduino/music-app/issues">
                        create an issue
                    </Link>
                    .
                </Text>
            </HStack>
        );
    }
};
