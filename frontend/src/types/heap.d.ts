declare module "heap" {
  export default class Heap<T> {
    constructor(comparator?: (a: T, b: T) => number);
    push(value: T): void;
    pop(): T | undefined;
    empty(): boolean;
  }
}
