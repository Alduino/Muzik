export enum ErrorCode {
    databaseAlreadyInitialised,
    databaseNotInitialised,
    musicStoreNotPicked
}

export function throwError(code: ErrorCode): never {
    const message = `${ErrorCode[code]} [id=${code}]`;
    throw new Error(message);
}

export function isCode(error: Error, code: ErrorCode): boolean {
    const {message} = error;
    const [, codeString] = message.match(/\[id=(\d+)]/);
    return code === parseInt(codeString);
}
