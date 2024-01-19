import {useState} from "react";

export interface UseSubscriptionStateRoute<Input, Output> {
    useSubscription(input: Input, opts: {
        onData(data: Output): void
    }): void;
}

export function useSubscriptionState<Input, Output>(route: UseSubscriptionStateRoute<Input, Output>, input: Input, initialValue: Output): Output {
    const [state, setState] = useState(initialValue);

    route.useSubscription(input, {
        onData: setState
    });

    return state;
}
