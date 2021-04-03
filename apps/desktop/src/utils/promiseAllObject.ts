type PromiseObject<T> = {
    [Key in keyof T]: Promise<T[Key]>;
};

export default async function promiseAllObject<T>(
    obj: PromiseObject<T>
): Promise<T> {
    const sourceEntries = Object.entries(obj) as [string, Promise<unknown>][];
    const extractedPromises = sourceEntries.map(entry => {
        const [key, value] = entry;
        return value.then(res => [key, res]);
    });
    const entriesPromise = Promise.all(extractedPromises);
    return entriesPromise.then(entries => Object.fromEntries(entries));
}
