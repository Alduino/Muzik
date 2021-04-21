import {Box, chakra} from "@chakra-ui/react";
import React, {ReactNode} from "react";

export const FadeOverflow = chakra(
    (props: {children: ReactNode; className?: string; disable?: boolean}) => (
        <Box
            position="relative"
            overflow="hidden"
            sx={
                props.disable
                    ? {}
                    : {
                          maskImage: `linear-gradient(90deg, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 100%)`
                      }
            }
            className={props.className}
        >
            {props.children}
        </Box>
    )
);
FadeOverflow.displayName = "FadeOverflow";
