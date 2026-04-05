export type Ok<T> = { ok: true; data: T }
export type Err<E> = { ok: false; error: E }
export type Result<T, E> = Ok<T> | Err<E>

export function ok(): Ok<undefined>
export function ok<T>(data: T): Ok<T>
export function ok<T>(data?: T): Ok<T | undefined> {
    return { ok: true, data }
}

export function err(): Err<undefined>
export function err<E>(error: E): Err<E>
export function err<E>(error?: E): Err<E | undefined> {
    return { ok: false, error }
}