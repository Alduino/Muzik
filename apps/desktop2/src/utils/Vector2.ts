export class Vector2 {
    readonly #x: number;
    readonly #y: number;

    constructor(x: number, y: number) {
        this.#x = x;
        this.#y = y;
    }

    get x() {
        return this.#x;
    }

    get y() {
        return this.#y;
    }

    #compute(other: Vector2 | number, fn: (a: number, b: number) => number) {
        if (typeof other === "number") other = new Vector2(other, other);
        return new Vector2(fn(this.#x, other.#x), fn(this.#y, other.#y));
    }

    add(other: Vector2 | number) {
        return this.#compute(other, (a, b) => a + b);
    }

    subtract(other: Vector2 | number) {
        return this.#compute(other, (a, b) => a - b);
    }

    multiply(other: Vector2 | number) {
        return this.#compute(other, (a, b) => a * b);
    }

    divide(other: Vector2 | number) {
        return this.#compute(other, (a, b) => a / b);
    }
}
