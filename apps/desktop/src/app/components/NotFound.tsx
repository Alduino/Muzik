import React, {FC} from "react";
import {Center, Text} from "@chakra-ui/react";
import {HeadedFloat} from "./lib/HeadedFloat";

export const NotFound: FC<{route: string}> = props => (
    <Center flex={1}>
        <HeadedFloat header="Something went wrong">
            <Text opacity={0.5} fontSize="sm">
                Error: NOT_FOUND/{props.route}
            </Text>
        </HeadedFloat>
    </Center>
);
