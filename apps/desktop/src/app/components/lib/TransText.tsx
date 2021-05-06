import {chakra, Text} from "@chakra-ui/react";
import React from "react";
import {useTranslation} from "react-i18next";

export interface TransTextProps {
    k: string;
    className?: string;
}

export const TransText = chakra((props: TransTextProps) => {
    const {t} = useTranslation("app");
    return <Text className={props.className}>{t(props.k)}</Text>;
});

TransText.displayName = "TransText";
