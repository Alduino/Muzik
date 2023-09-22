export class Progress {
    #listeners = new Set<() => void>();

    #musicDiscovered = 0;

    get musicDiscovered() {
        return this.#musicDiscovered;
    }

    incrementMusicDiscovered() {
        this.#musicDiscovered++;
        this.#notify();
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
