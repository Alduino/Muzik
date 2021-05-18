import {Center, Text} from "@chakra-ui/react";
import React, {FC} from "react";
import {HeadedFloat} from "./HeadedFloat";

export interface ErrorLabelProps {
    message: string;
}

export const ErrorLabel: FC<ErrorLabelProps> = props => (
    <Center flex={1}>
        <HeadedFloat header="Something went wrong">
            <Text opacity={0.5} fontSize="sm">
                Error: {props.message}
            </Text>
        </HeadedFloat>
    </Center>
);
