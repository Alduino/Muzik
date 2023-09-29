import {ReactElement, useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {Spinner} from "../../components/Spinner.tsx";
import useEventHandler from "../../hooks/useEventHandler.ts";
import {useTranslation} from "../../hooks/useTranslation.ts";
import {trpc} from "../../utils/trpc.ts";
import {
    containerClass,
    messageClass,
    pageClass,
    spinnerClass
} from "./styles.css.ts";

function useLoadingMessages() {
    const t = useTranslation("splash");

    const messages = [
        t("message-1"),
        t("message-2"),
        t("message-3"),
        t("message-4"),
        t("message-5"),
        t("message-6")
    ];

    const messageCount = messages.length;

    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex(idx => (idx + 1) % messageCount);
        }, 20000);

        return () => clearInterval(interval);
    }, [messageCount]);

    return messages[messageIndex];
}

function useLoadingCompleteNavigation() {
    const navigate = useNavigate();

    const handleLoadingComplete = useEventHandler(() => {
        navigate("/songs");
    });

    trpc.meta.init.useSubscription(undefined, {
        onData: handleLoadingComplete
    });
}

export function Component(): ReactElement {
    const loadingMessage = useLoadingMessages();
    useLoadingCompleteNavigation();

    return (
        <div className={pageClass}>
            <div className={containerClass}>
                <Spinner className={spinnerClass} />
                <p className={messageClass}>{loadingMessage}</p>
            </div>
        </div>
    );
}
