import React, {FC} from "react";
import {Center, Heading, Text} from "@chakra-ui/react";

export const NotFound: FC<{route: string}> = props => (
    <Center flex={1}>
        <Heading>Something went wrong</Heading>
        <Text px={8} py={4} fontSize="sm" color="gray.500">
            Error: NOT_FOUND/{props.route}
        </Text>
    </Center>
);
