export interface DataReader<T> {
    /**
     * Returns a normalised value between zero and one.
     * Offset is in samples.
     */
    read(data: T, offset: number): number;

    /**
     * Returns the number of samples in the given data.
     */
    getLength(data: T): number;
}
