export interface ProgressStatus {
    stage: string;

    progress: number;

    /**
     * Null for indeterminate progress
     */
    total: number | null;
}

export class Progress {
    #listeners = new Set<() => void>();

    #status: ProgressStatus = {
        stage: "waiting",
        progress: 0,
        total: null
    };

    start(stage: string, total: number | null) {
        this.#status = {
            stage,
            progress: 0,
            total
        };

        this.#notify();
    }

    increment() {
        this.#status.progress++;

        this.#notify();
    }

    getStatus() {
        return this.#status;
    }

    addListener(listener: () => void) {
        this.#listeners.add(listener);

        return () => {
            this.#listeners.delete(listener);
        };
    }

    #notify() {
        for (const listener of this.#listeners) {
            listener();
        }
    }
}
