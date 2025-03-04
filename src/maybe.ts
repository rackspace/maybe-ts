import { ErrorResult, OkayResult, Result } from "./result";
import { toString } from "./utils";

/** Maybe "some" type value, maybe "none" */
export type Maybe<T> = MaybeValue<T> | MaybeNone;
/** A `Promise` to a `Maybe` */
export type PromiseMaybe<T> = Promise<Maybe<T>>;

type MaybeValueType<T extends Maybe<any>> =
  T extends MaybeValue<infer U> ? U : never;
type MaybeValueTypes<T extends Maybe<any>[]> = {
  [key in keyof T]: T[key] extends Maybe<any> ? MaybeValueType<T[key]> : never;
};

/**
 * Base interface for both MaybeValue and MaybeNone.
 */
interface BaseMaybe<T>
  extends Iterable<T extends Iterable<infer U> ? U : never> {
  readonly isValue: boolean;
  readonly isNone: boolean;

  // expectSome(message?: string): T;
  // expectNone(message?: string): T;

  /**
   * Returns the "some" value.
   * Use if you want a "none" value to throw an error.
   *
   * @returns the "some" value
   * @throws NoneError when "none".
   */
  unwrap(): T;

  /**
   * Returns the "some" value or a provided default if "none".
   *
   * @returns the "some" value, or `altValue` when "none"
   */
  unwrapOr<T2>(altValue: T2): T | T2;

  /**
   * Returns the "some" value or `null` instead of throwing an error if "none".
   *
   * @returns the "some" value, or `null` when "none"
   */
  unwrapOrNull(): T | null;

  /**
   * Returns the "some" value, if exists. Throws when "none".
   *
   * @param errorMsg the Error or message (in new Error) to throw if no value.
   * @throws `NoneError` when "none".
   */
  unwrapOrThrow(errorMsg: string | Error): T;

  /**
   * Calls `mapperFn` when "some" value, otherwise returns itself as still "none".
   * This function can be used for control flow based on `Maybe` values.
   *
   * @param mapperFn function to map this value to another `Maybe`. (See `.map` to map values instead.)
   * @returns mapped "some" value, or `this` when "none".
   */
  andThen<T2>(mapperFn: (value: T) => Maybe<T2>): Maybe<T2>;

  /**
   * Maps an `Maybe<T>` to `Maybe<U>` by applying a function to the "some" value,
   * leaving a "none" untouched.
   *
   * This function can be used to compose the `Maybe` of two functions.
   *
   * @param mapperFn function to map this value to a new value.
   *                 (See `.andThen` to map to a new `Maybe` instead.)
   * @returns a new `Maybe` with the mapped "some" value, or `this` when "none"
   */
  map<U>(mapperFn: (value: T) => U): Maybe<U>;

  /**
   * Maps an `Maybe<T>` to `Maybe<U>` by either converting `T` to `U` using `mapperFn` (in case
   * of "some") or using the `defaultValue` value (in case of "none").
   *
   * If `defaultValue` is a result of a function call consider using `mapOrElse` instead, it will
   * only evaluate the function when needed.
   *
   * @param defaultValue alternative value to use when "none"
   * @param mapperFn function to map this "some" value to another
   * @returns the resulting value
   */
  mapOr<U>(defaultValue: U, mapperFn: (value: T) => U): U;

  /**
   * Maps an `Maybe<T>` to `Maybe<U>` by either converting `T` to `U` using `mapperFn` (in case
   * of "some") or producing a default value using the `defaultValueFn` function (in case of "none").
   *
   * @param defaultValueFn function to produce an alternative value to use when "none"
   * @param mapperFn function to map this "some" value to another
   * @returns the resulting value
   */
  mapOrElse<U>(defaultValueFn: () => U, mapperFn: (value: T) => U): U;

  /**
   * Convert a `Maybe<T>` to a `Result<T, E>`, with the provided `Error` value
   * to use when this is "none".
   * @param error to use when "none"
   * @return a `Result` with this "some" as the "okay" value, or `error` as the "error".
   */
  toResult<E>(error: E): Result<T, E>;

  /**
   * This `Maybe` as a loggable string.
   * @returns string describing this `Maybe`
   */
  toString(): string;
}

/**
 * Contains Maybe's "none" value
 */
class MaybeNone implements BaseMaybe<never> {
  readonly isValue = false as const;
  readonly isNone = true as const;

  /**
   * Helper function if you know you have a `Maybe<T>` and `T` is iterable
   * @returns iterator that is immediately done
   */
  [Symbol.iterator](): Iterator<never, never, any> {
    return {
      next(): IteratorResult<never, never> {
        return { done: true, value: undefined! };
      },
    };
  }

  unwrap(): never {
    throw new NoneError();
  }

  unwrapOr<T2>(altValue: T2): T2 {
    return altValue;
  }

  unwrapOrNull(): null {
    return null;
  }

  unwrapOrThrow(errorMsg: string | Error): never {
    if (errorMsg instanceof Error) {
      throw errorMsg;
    } else {
      throw new NoneError(errorMsg);
    }
  }

  map(_mapperFn: unknown): Maybe.None {
    return this;
  }

  mapOr<T2>(defaultValue: T2, _mapperFn: unknown): T2 {
    return defaultValue;
  }

  mapOrElse<U>(defaultValueFn: () => U, _mapperFn: unknown): U {
    return defaultValueFn();
  }

  andThen(_opFn: unknown): Maybe.None {
    return this;
  }

  toResult<E>(error: E): ErrorResult<E> {
    return new ErrorResult(error);
  }

  toString(): string {
    return "None";
  }
}

/** Error that is thrown if you unwrap a "none" `Maybe` */
export class NoneError extends Error {
  constructor(message?: string) {
    super(message ?? "Maybe is none");
  }
}

/**
 * A special form of Maybe's "none" value with additional context.
 */
class MaybeNotFound extends MaybeNone {
  private readonly what: string[];

  /**
   * Construct a `Maybe` "none" that indicates a "what" wasn't found.
   * @param what indicate "what" wasn't found.
   */
  constructor(what: string[]) {
    super();
    this.what = what;
  }

  unwrap(): never {
    throw new NotFoundError("NotFound: " + this.what.join(" "));
  }
}

/** HTTP-friendly `Error` that is thrown when unwrapping a `MaybeNotFound` */
export class NotFoundError extends Error {
  /** Property use by some HTTP servers */
  readonly status = 404 as const;
  /** Property use by some HTTP servers */
  readonly statusCode = 404 as const;

  constructor(msg: string) {
    super(msg);
  }
}

/**
 * Contains a success "some" value
 */
class MaybeValue<T> implements BaseMaybe<T> {
  readonly isValue = true as const;
  readonly isNone = false as const;

  /**
   * Helper function if you know you have a `Maybe<T>` and `T` is iterable.
   * @returns value's iterator or an iterator that is immediately done, if value is not iterable.
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

  /**
   * Creates a `Maybe<T>` with a "some" value.
   */
  constructor(public readonly value: T) {
    // Protect against nesting
    if (value instanceof MaybeValue) {
      this.value = value.value;
    }
  }

  unwrap(): T {
    return this.value;
  }

  unwrapOr(_altValue: unknown): T {
    return this.value;
  }

  unwrapOrNull(): T | null {
    return this.value;
  }

  unwrapOrThrow(_msg: string | Error): T {
    return this.value;
  }

  map<T2>(mapperFn: (value: T) => T2): MaybeValue<T2> {
    return new MaybeValue<T2>(mapperFn(this.value));
  }

  mapOr<T2>(_defaultValue: T2, mapperFn: (value: T) => T2): T2 {
    return mapperFn(this.value);
  }

  mapOrElse<U>(_defaultValueFn: () => U, mapperFn: (value: T) => U): U {
    return mapperFn(this.value);
  }

  andThen<T2>(mapperFn: (value: T) => Maybe<T2>): Maybe<T2> {
    return mapperFn(this.value);
  }

  toResult<E>(_error: E): OkayResult<T> {
    return new OkayResult(this.value);
  }

  toString(): string {
    return `Value(${toString(this.value)})`;
  }
}

/** Export helpers within the Maybe namespace */
export namespace Maybe {
  /*
   * Export generic None and Empty as singletons, then freeze them.
   */

  /** Generic None result of a Maybe */
  export const None = new MaybeNone();
  export type None = MaybeNone;
  Object.freeze(None);

  /** A Successful Maybe result that just doesn't have any value */
  export const Empty = new MaybeValue<void>(undefined);
  export type Empty = MaybeValue<void>;
  Object.freeze(Empty);

  /*
   * Construction factories
   */

  /** Factory create a `Maybe` with "some" value */
  export const withValue = <T>(value: T) => new MaybeValue(value);

  /**
   * Factory create a `Maybe` of "none" with context of "what" was not found.
   * @param what string(s) describing what wasn't found
   */
  export const notFound = (...what: string[]) => new MaybeNotFound(what);

  /**
   * Factory create a `Maybe` with a "none" result. You can use the `Maybe.None` singleton directly;
   * this just provides synchronicity with the other factory functions.
   */
  export const asNone = () => None;

  /**
   * Factory create a `Maybe` with success but no actual value (`void`).
   * You can use the Empty singleton directly instead;
   * this just provides synchronicity with the other factory functions.
   */
  export const empty = () => Empty;

  /**
   * Helper to wrap a value as a `Maybe`.
   *
   * @param value a value, undefined, or null
   * @return a `Maybe`: "none" if `undefined` or `null`, otherwise "some" value.
   */
  export const wrap = <T>(value: T | undefined | null) =>
    value == null ? None : new MaybeValue(value);

  /**
   * Returns the value contained in `maybe`, or throws if "none".
   * Same as `maybe.unwrap()`, but more readable when `maybe` is returned from an async
   * function: `Maybe.unwrap(await repository.get(id))`
   *
   * @param maybe to unwrap
   * @return the "some" value
   * @throws NoneError if `maybe` is "none".
   */
  export const unwrap = <T>(maybe: Maybe<T>) => maybe.unwrap();

  /**
   * Returns the "some" value in `maybe`, or `null` if "none".
   * Same as `maybe.unwrapOrNull()`, but more readable when `maybe` is returned from an
   * async function: `Maybe.unwrapOrNull(await repository.get(id))`
   *
   * @param maybe to unwrap
   * @return the "some" value or `null`
   */
  export const unwrapOrNull = <T>(maybe: Maybe<T>) => maybe.unwrapOrNull();

  /**
   * Parse a set of `maybes`, returning an array of all "some" values.
   * Short circuits with the first "none" found, if any
   *
   * @param maybes list to check
   * @return array of "some" values or `Maybe.None`.
   */
  export function allOrNone<T extends Maybe<any>[]>(
    ...maybes: T
  ): Maybe<MaybeValueTypes<T>> {
    const someValues = [];
    for (const maybe of maybes) {
      if (maybe.isValue) {
        someValues.push(maybe.value);
      } else {
        return maybe;
      }
    }

    return new MaybeValue(someValues as MaybeValueTypes<T>);
  }

  /**
   * Parse a set of `maybes`, returning an array of all "some" values,
   * filtering out any "none"s found, if any.
   *
   * @param maybes list to check
   * @return array of some" values
   */
  export function allValues<T>(...maybes: Maybe<T>[]): T[] {
    return maybes
      .filter((maybe) => maybe.isValue)
      .map((maybe) => maybe.unwrap());
  }

  /**
   * Parse a set of `maybes`, short-circuits when an input value is "some".
   * If no "some" is found, returns a "none".
   * @param maybes list to check
   * @return the first "some" value given, or otherwise "none".
   */
  export function any<T extends Maybe<any>[]>(
    ...maybes: T
  ): Maybe<MaybeValueTypes<T>[number]> {
    // short-circuits
    for (const maybe of maybes) {
      if (maybe.isValue) {
        return maybe as MaybeValue<MaybeValueTypes<T>[number]>;
      }
    }

    // it must be None
    return None;
  }

  /**
   * Type-guard to identify and narrow a `Maybe`
   */
  export function isMaybe<T>(value: unknown): value is Maybe<T> {
    return value instanceof MaybeValue || value instanceof MaybeNone;
  }
}
