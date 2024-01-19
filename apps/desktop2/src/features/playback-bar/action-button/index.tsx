import {ReactElement, useState} from "react";
import {Button, ButtonProps} from "../../../components/button";

interface MutationQuery {
    useMutation(): {
        mutate(arg: void): void;
    };
}

interface SubscriptionQuery<T> {
    useSubscription(input: void, opts: {
        onData(data: T): void;
    }): void;
}

export interface ActionButtonProps extends Pick<ButtonProps, "icon" | "label" | "iconOnly" | "fullWidth"> {
    mutationQuery: MutationQuery;
    enabledQuery: SubscriptionQuery<boolean>;
}

export function ActionButton({
    mutationQuery,
    enabledQuery,
    ...buttonProps
}: ActionButtonProps): ReactElement {
    const [enabled, setEnabled] = useState(false);

    enabledQuery.useSubscription(undefined, {
        onData(data) {
            setEnabled(data);
        }
    });

    const handleClick = mutationQuery.useMutation();

    return (
        <Button {...buttonProps} onClick={handleClick.mutate.bind(null, undefined)} disabled={!enabled} />
    );
}
