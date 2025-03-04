import { Maybe } from "./maybe";
import { toString } from "./utils";

/** Result with a value, that is either an "okay" value or an "error" value */
export type Result<T, E> = OkayResult<T> | ErrorResult<E>;
/** A `Promise` to a `Result` */
export type PromiseResult<T, E> = Promise<Result<T, E>>;

export type OkayResultType<T extends Result<any, any>> =
  T extends OkayResult<infer U> ? U : never;
export type ErrorResultType<T> = T extends ErrorResult<infer U> ? U : never;

export type OkayResultTypes<T extends Result<any, any>[]> = {
  [key in keyof T]: T[key] extends Result<infer _U, any>
    ? OkayResultType<T[key]>
    : never;
};
export type ErrorResultTypes<T extends Result<any, any>[]> = {
  [key in keyof T]: T[key] extends Result<infer _U, any>
    ? ErrorResultType<T[key]>
    : never;
};

/**
 * Base interface for OkayResult and ErrorResult.
 */
interface BaseResult<T, E>
  extends Iterable<T extends Iterable<infer U> ? U : never> {
  readonly isOkay: boolean;
  readonly isError: boolean;

  /**
   * When "okay", returns the value, otherwise throw an `Error` with the `message`.
   * Generally you should use an unwrap function instead, but this is useful for unit testing.
   *
   * @param message the message to throw when this is an "error"
   * @returns the value when this is "okay"
   * @throws `new Error(message,value)` when is "error"
   */
  expectOkay(message?: string): T;

  /**
   * When "error", returns the value, otherwise throw an `Error` with the message.
   * Because this function may throw, its use is generally discouraged.
   * Instead, prefer to handle the error case explicitly or with `unwrapOr` or `unwrapOrNull`.
   * This may be useful for unit testing.
   *
   * @param msg the message to throw when "okay".
   * @returns the value when "error"
   * @throws `new Error(msg,value)` when "okay"
   */
  expectError(msg?: string): E;

  /**
   * When "okay", returns the value, otherwise throws the "error" value.
   * Because this function may throw, its use is generally discouraged.
   * Instead, prefer to handle the error case explicitly or with `unwrapOr` or `unwrapOrNull`.
   *
   * @returns "okay" value
   * @throws "error" value
   */
  unwrap(): T;

  /**
   * When "okay", returns the value; otherwise returns the given alternative.
   *
   * @param altValue value to return when "error"
   * @returns the "okay" value or the `altValue`.
   */
  unwrapOr<T2>(altValue: T2): T | T2;

  /**
   * When "okay", returns the value; otherwise returns `null`.
   *
   * @returns the "okay" value or `null`
   */
  unwrapOrNull(): T | null;

  /**
   * When "okay", returns the value;
   * otherwise if an `altError` is provided, it is thrown,
   * otherwise the "error" value of this result is thrown.
   *
   * When no `altError` parameter is provided, this is the same as `.unwrap()`
   * but a bit more descriptive.
   *
   * @param altError (optional) error to throw when "error"
   * @returns "okay" value
   * @throws `altError` or the result "error" value
   */
  unwrapOrThrow(altError?: string | Error): T;

  /**
   * Calls `mapperFn` if the result "okay", otherwise returns this "error" `Result` as-is.
   * This function can be used for control flow based on `Result` values.
   *
   * @param mapperFn function to map this value to another `Result`. (See `.map` to map values instead.)
   * @returns mapped "okay" `Result` or `this` when "error"
   */
  andThen<T2>(mapperFn: (value: T) => OkayResult<T2>): Result<T2, E>;
  andThen<E2>(mapperFn: (value: T) => ErrorResult<E2>): Result<T, E | E2>;
  andThen<T2, E2>(mapperFn: (value: T) => Result<T2, E2>): Result<T2, E | E2>;
  andThen<T2, E2>(mapperFn: (value: T) => Result<T2, E2>): Result<T2, E | E2>;

  /**
   * Maps a `Result<T, E>` to `Result<U, E>` by applying a function to the "okay" value,
   * leaving an "error" value unmapped.
   *
   * This function can be used to compose the results of two functions.
   *
   * @param mapperFn function to map this value to a new value.
   *                 (See `.andThen` to map to a new `Result` instead.)
   * @returns a new `Result` with the mapped "okay" value, or `this` when "error"
   */
  map<U>(mapperFn: (value: T) => U): Result<U, E>;

  /**
   * Maps a `Result<T, E>` to `Result<U, E>` when "okay" by applying a function.
   * When "error", returns the provided `Error` (tossing the existing error).
   *
   * This function can be used to compose the results of two functions.
   *
   * @param mapperFn function to map this value to a new value.
   * @param altError alternative "error" to use
   * @returns a new `Result` with the mapped "okay" value or the `altError` value
   */
  mapOr<U, E2>(mapperFn: (value: T) => U, altError: E2): Result<U, E | E2>;

  /**
   * Maps a `Result<T, E>` to `Result<T, F>` by applying a function to an "error" value,
   * leaving an "okay" value unmapped.
   *
   * This function can be used to pass through a successful result while handling an error.
   *
   * @param mapperFn function to map this "error" value to a new error
   * @returns a new `Result` with the mapped error, or `this` when "okay"
   */
  mapError<F>(mapperFn: (val: E) => F): Result<T, F>;

  /**
   * Converts this `Result<T, E>` to `Maybe<T>`,
   * discarding any error details in place of a simple `Maybe.None`.
   * @returns the "okay" value as a `Maybe`, or `Maybe.None` when "error"
   */
  toMaybe(): Maybe<T>;

  /**
   * This `Result` as a loggable string.
   * @returns string describing this `Result`
   */
  toString(): string;
}

/**
 * Contains Result's error value
 */
export class ErrorResult<E> implements BaseResult<never, E> {
  readonly isOkay = false as const;
  readonly isError = true as const;
  private readonly _stack: string;

  /**
   * Helper function if you know you have a Result<T> and T is iterable
   * @returns iterator that is immediately done
   */
  [Symbol.iterator](): Iterator<never, never, any> {
    return {
      next(): IteratorResult<never, never> {
        return { done: true, value: undefined! };
      },
    };
  }

  constructor(public readonly value: E) {
    // Protect against double-wrapping
    if (value instanceof OkayResult || value instanceof ErrorResult) {
      this.value = value.value;
    }

    const stackLines = new Error().stack?.split("\n").slice(2);
    if (stackLines?.[0]?.includes("ErrorResult")) {
      stackLines.shift();
    }

    this._stack = stackLines?.join("\n") ?? "";
  }

  expectOkay(msg: string): never {
    throw new Error(`${msg} - ${toString(this.value)}\n${this._stack}`, {
      cause: this.value,
    });
  }

  expectError(_msg: string): E {
    return this.value;
  }

  unwrap(): never {
    throw this.value;
  }

  unwrapOr<T2>(altValue: T2): T2 {
    return altValue;
  }

  unwrapOrNull(): null {
    return null;
  }

  unwrapOrThrow(altError?: string | Error): never {
    if (altError) {
      if (altError instanceof Error) {
        throw altError;
      } else {
        throw new Error(altError.toString());
      }
    }
    throw this.value;
  }

  andThen(_mapperFn: unknown): ErrorResult<E> {
    return this;
  }

  map(_mapperFn: unknown): ErrorResult<E> {
    return this;
  }

  mapOr<E2>(_mapperFn: unknown, altError: E2): ErrorResult<E2> {
    return new ErrorResult<E2>(altError);
  }

  mapError<E2>(mapperFn: (err: E) => E2): ErrorResult<E2> {
    return new ErrorResult(mapperFn(this.value));
  }

  toMaybe(): Maybe<never> {
    return Maybe.None;
  }

  toString(): string {
    return toString(this.value);
  }

  get stack(): string | undefined {
    return `${this}\n${this._stack}`;
  }
}

/**
 * Contains the success value
 */
export class OkayResult<T> implements BaseResult<T, never> {
  readonly isOkay = true as const;
  readonly isError = false as const;

  /**
   * Helper function if you know you have a Result<T> and T is iterable
   * @returns iterator over the okay value
   */
  [Symbol.iterator](): Iterator<T extends Iterable<infer U> ? U : never> {
    const obj = Object(this.value) as Iterable<any>;
    return Symbol.iterator in obj
      ? obj[Symbol.iterator]()
      : {
          next(): IteratorResult<never, never> {
            return { done: true, value: undefined! };
          },
        };
  }

  constructor(public readonly value: T) {
    // Protect against double-wrapping
    if (value instanceof OkayResult || value instanceof ErrorResult) {
      this.value = value.value;
    }
  }

  expectOkay(_msg: string): T {
    return this.value;
  }

  expectError(msg: string): never {
    throw new Error(`${msg} - ${this.toString()}`);
  }

  unwrap(): T {
    return this.value;
  }

  unwrapOr(_altValue: unknown): T {
    return this.value;
  }

  unwrapOrNull(): T {
    return this.value;
  }

  unwrapOrThrow(_altError?: unknown): T {
    return this.value;
  }

  /**
   * Returns the contained `Okay` value, but never throws.
   * Unlike `unwrap()`, this method doesn't throw and is only callable on an OkayResult<T>.
   *
   * Therefore, it can be used instead of `unwrap()` as a maintainability safeguard that
   * will fail to compile if the error type of the Result is later changed to an error
   * that can actually occur.
   */
  safeUnwrap(): T {
    return this.value;
  }

  andThen<T2>(mapperFn: (value: T) => OkayResult<T2>): OkayResult<T2>;
  andThen<E2>(mapperFn: (value: T) => ErrorResult<E2>): Result<T, E2>;
  andThen<T2, E2>(mapperFn: (value: T) => Result<T2, E2>): Result<T2, E2>;
  andThen<T2, E2>(mapperFn: (value: T) => Result<T2, E2>): Result<T2, E2> {
    return mapperFn(this.value);
  }

  map<T2>(mapperFn: (value: T) => T2): OkayResult<T2> {
    return new OkayResult(mapperFn(this.value));
  }

  mapOr<T2>(mapperFn: (value: T) => T2, _altError: unknown): OkayResult<T2> {
    return new OkayResult(mapperFn(this.value));
  }

  mapError(_mapperFn: unknown): OkayResult<T> {
    return this;
  }

  toMaybe(): Maybe<T> {
    return Maybe.withValue(this.value);
  }

  toString(): string {
    return `Okay: ${toString(this.value)}`;
  }
}

export namespace Result {
  /** A reusable okay result with no (undefined) value */
  export const OkayVoid = new OkayResult<void>(undefined);
  Object.freeze(OkayVoid);

  /*
   * Construction factories
   */

  /** Factory to create an "okay" result */
  export const okay = <T>(value: T) => new OkayResult<T>(value);

  /** Factory to create an "okay" result with no (undefined) value */
  export const okayVoid = () => OkayVoid;

  /** Factory to create an "error" result */
  export const error = <E>(error: E) => new ErrorResult<E>(error);

  /**
   * Parse a set of `Result`s, returning an array of all "okay" values.
   * Short circuits to return the first "error" found, if any.
   *
   * @param results array of results; possibly a mix of "okay"s and "error"s
   * @return a single `Result` with the first "error" or an "okay" value as an array of all the "okay" values.
   */
  export function all<T extends Result<any, any>[]>(
    ...results: T
  ): Result<OkayResultTypes<T>, ErrorResultTypes<T>[number]> {
    const okResult = [];
    for (const result of results) {
      if (result.isOkay) {
        okResult.push(result.value);
      } else {
        return result as ErrorResult<ErrorResultTypes<T>[number]>;
      }
    }

    return new OkayResult(okResult as OkayResultTypes<T>);
  }

  /**
   * Parse a set of `Result`s and returns the first input value that "okay".
   * If no "okay" is found, returns an "error" result with the error values.
   *
   * @param results array of results; possibly a mix of "okay"s and "error"s
   * @return a single `Result` with the first "okay" or an "error" value as an array of all the "error" values.
   */
  export function any<T extends Result<any, any>[]>(
    ...results: T
  ): Result<OkayResultTypes<T>[number], ErrorResultTypes<T>> {
    const errResult = [];

    for (const result of results) {
      if (result.isOkay) {
        return result as OkayResult<OkayResultTypes<T>[number]>;
      } else {
        errResult.push(result.value);
      }
    }

    return new ErrorResult(errResult as ErrorResultTypes<T>);
  }

  /**
   * Returns the value contained in `result`, or throws the "error" in `result`.
   *
   * Same as `result.unwrap()`, but more reads nicer when `Result` is returned from an async
   * function: `Result.unwrap(await repository.create(widget))`
   *
   * @param result to unwrap
   * @throws if the result is "error"
   */
  export const unwrap = <T, E>(result: Result<T, E>) => result.unwrap();

  /**
   * Wrap an operation that may throw and capture it into a `Result`.
   *
   * @param opFn the operation function
   * @return a `Result` with the function output - either "okay" or a caught "error".
   */
  export function wrap<T, E = unknown>(opFn: () => T): Result<T, E> {
    try {
      return new OkayResult(opFn());
    } catch (e) {
      return new ErrorResult<E>(e as E);
    }
  }

  /**
   * Wrap an operation that may throw and capture it into a `Result`.
   *
   * @param opFn the operation function
   * @return a `Result` with the function output - either "okay" or a caught "error".
   */
  export function wrapAsync<T, E = unknown>(
    opFn: () => Promise<T>,
  ): PromiseResult<T, E> {
    try {
      return opFn()
        .then((val) => new OkayResult(val))
        .catch((e) => new ErrorResult(e));
    } catch (e) {
      return Promise.resolve(new ErrorResult(e as E));
    }
  }

  /**
   * Type guard to identify and narrow a `Result`
   */
  export function isResult<T = any, E = any>(
    val: unknown,
  ): val is Result<T, E> {
    return val instanceof ErrorResult || val instanceof OkayResult;
  }
}
