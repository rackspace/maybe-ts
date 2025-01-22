/** Maybe "some" type value, maybe "None" */
export type Maybe<T> = MaybeValue<T> | MaybeNone;
/** A Promise to a Maybe */
export type PromiseMaybe<T> = Promise<Maybe<T>>;
type MaybeValueType<T extends Maybe<any>> =
  T extends MaybeValue<infer U> ? U : never;
type MaybeValueTypes<T extends Maybe<any>[]> = {
  [key in keyof T]: T[key] extends Maybe<any> ? MaybeValueType<T[key]> : never;
};

/** Type-guard to identify and narrow a Maybe */
export function isMaybe<T>(value: unknown): value is Maybe<T> {
  return value instanceof MaybeValue || value instanceof MaybeNone;
}

// More exports in the namespace at the end of this file...

/**
 * Base interface for both MaybeValue and MaybeNone.
 */
interface BaseMaybe<T>
  extends Iterable<T extends Iterable<infer U> ? U : never> {
  readonly isValue: boolean;
  readonly isNone: boolean;

  /**
   * Returns the contained value.
   * Use if you want a 'None' value to throw an error.
   *
   * @throws if the value is `None`.
   */
  unwrap(): T;

  /**
   * Returns the contained value or a provided default.
   */
  unwrapOr<T2>(val: T2): T | T2;

  /**
   * Returns the contained value or null instead of throwing an error on 'None'.
   */
  unwrapOrNull(): T | null;

  /**
   * Returns the contained value, if exists. Throws an error if not.
   * @param errorMsg the Error or message (in new Error) to throw if no value.
   */
  unwrapOrThrow(errorMsg: string | Error): T;

  /**
   * Calls `mapper` if the Maybe is a value, otherwise returns itself as still 'None'.
   * This function can be used for control flow based on `Maybe` values.
   */
  andThen<T2>(mapper: (val: T) => Maybe<T2>): Maybe<T2>;

  /**
   * Maps an `Maybe<T>` to `Maybe<U>` by applying a function to a contained  value,
   * leaving a `None` value untouched.
   *
   * This function can be used to compose the Maybe of two functions.
   */
  map<U>(mapper: (val: T) => U): Maybe<U>;

  /**
   * Maps an `Maybe<T>` to `Maybe<U>` by either converting `T` to `U` using `mapper` (in case
   * of `Some`) or using the `default_` value (in case of `None`).
   *
   * If `default` is a result of a function call consider using `mapOrElse` instead, it will
   * only evaluate the function when needed.
   */
  mapOr<U>(default_: U, mapper: (val: T) => U): U;

  /**
   * Maps an `Option<T>` to `Option<U>` by either converting `T` to `U` using `mapper` (in case
   * of `Some`) or producing a default value using the `default` function (in case of `None`).
   */
  mapOrElse<U>(default_: () => U, mapper: (val: T) => U): U;
}

/**
 * Contains Maybe's 'None' value
 */
class MaybeNone implements BaseMaybe<never> {
  readonly isValue = false as const;
  readonly isNone = true as const;

  /**
   * Helper function if you know you have a Maybe<T> and T is iterable
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
    throw new Error(`Tried to unwrap None`);
  }

  unwrapOr<T2>(val: T2): T2 {
    return val;
  }

  unwrapOrNull(): null {
    return null;
  }

  unwrapOrThrow(errorMsg: string | Error): never {
    if (errorMsg instanceof Error) {
      throw errorMsg;
    } else {
      throw new Error(errorMsg);
    }
  }

  map(_mapper: unknown): Maybe.None {
    return this;
  }

  mapOr<T2>(default_: T2, _mapper: unknown): T2 {
    return default_;
  }

  mapOrElse<U>(default_: () => U, _mapper: unknown): U {
    return default_();
  }

  andThen(_op: unknown): Maybe.None {
    return this;
  }

  toString(): string {
    return "None";
  }
}

/**
 * A special form of Maybe's 'None' value with additional context.
 */
class MaybeNotFound extends MaybeNone {
  private readonly what: string[];

  constructor(what: string[]) {
    super();
    this.what = what;
  }

  unwrap(): never {
    throw new NotFoundError("NotFound: " + this.what.join(" "));
  }
}

/** Error that is thrown when unwrapping a MaybeNotFound */
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
 * Contains the success 'Some' value
 */
class MaybeValue<T> implements BaseMaybe<T> {
  readonly isValue = true as const;
  readonly isNone = false as const;
  readonly value!: T;

  /**
   * Helper function if you know you have a Maybe<T> and T is iterable.
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

  constructor(val: T) {
    /* istanbul ignore next - how is this possible? */
    if (!(this instanceof MaybeValue)) {
      return new MaybeValue(val);
    }
    this.value = val;
  }

  unwrap(): T {
    return this.value;
  }

  unwrapOr(_val: unknown): T {
    return this.value;
  }

  unwrapOrNull(): T | null {
    return this.value;
  }

  unwrapOrThrow(_msg: string | Error): T {
    return this.value;
  }

  map<T2>(mapper: (val: T) => T2): MaybeValue<T2> {
    return new MaybeValue<T2>(mapper(this.value));
  }

  mapOr<T2>(_default_: T2, mapper: (val: T) => T2): T2 {
    return mapper(this.value);
  }

  mapOrElse<U>(_default_: () => U, mapper: (val: T) => U): U {
    return mapper(this.value);
  }

  andThen<T2>(mapper: (val: T) => Maybe<T2>): Maybe<T2> {
    return mapper(this.value);
  }

  toString(): string {
    return `Value(${toString(this.value)})`;
  }
}

/* Helper to avoid [object Object] in string representation */
function toString(val: unknown): string {
  let value = String(val);
  if (value === "[object Object]") {
    try {
      value = JSON.stringify(val);
    } catch {
      /* use unstringified value */
    }
  }
  return value;
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

  /** Factory create a Maybe with 'Some' value */
  export const withValue = <T>(value: T) => new MaybeValue(value);

  /**
   * Factory create a Maybe of None with context of what was not found
   * @param what string(s) describing what wasn't found
   */
  export const notFound = (...what: string[]) => new MaybeNotFound(what);

  /**
   * Factory create a Maybe with 'None' result. You can use the None singleton directly;
   * this just provides synchronicity with the other factory functions.
   */
  export const asNone = () => None;

  /**
   * Factory create a Maybe with success but no actual value.
   * You can use the Empty singleton directly instead;
   * this just provides synchronicity with the other factory functions.
   */
  export const empty = () => Empty;

  /**
   * Wrap a value as a Maybe.
   *
   * @param value a value, undefined, or null
   * @return a Maybe, None if undefined or null, otherwise some value.
   */
  export const wrap = <T>(value: T | undefined | null) =>
    value == null ? None : new MaybeValue(value);

  /**
   * Returns the value contained in maybe, or throws if 'None'.
   * Same as `maybe.unwrap()`, but more convenient when maybe is returned from an async
   * function: `Maybe.unwrap(await repository.get(id))`
   *
   * @param maybe to unwrap
   * @throws if the value is `None`.
   */
  export const unwrap = <T>(maybe: Maybe<T>) => maybe.unwrap();

  /**
   * Returns the value contained in maybe, or `null` if 'None'.
   * Same as `maybe.unwrapOrNull()`, but more convenient when maybe is returned from an
   * async function: `Maybe.unwrapOrNull(await repository.get(id))`
   *
   * @param maybe to unwrap
   */
  export const unwrapOrNull = <T>(maybe: Maybe<T>) => maybe.unwrapOrNull();

  /**
   * Parse a set of Maybes, returning an array of all `Some` values.
   * Short circuits with the first `None` found, if any
   */
  export function allOrNone<T extends Maybe<any>[]>(
    ...options: T
  ): Maybe<MaybeValueTypes<T>> {
    const someOption = [];
    for (const option of options) {
      if (option.isValue) {
        someOption.push(option.value);
      } else {
        return option;
      }
    }

    return new MaybeValue(someOption as MaybeValueTypes<T>);
  }

  /**
   * Parse a set of Maybes, returning an array of all `Some` values,
   * filtering out any `None`s found, if any.
   */
  export function allValues<T>(...options: Maybe<T>[]): T[] {
    return options
      .filter((option) => option.isValue)
      .map((maybe) => maybe.unwrap());
  }

  /**
   * Parse a set of Maybes, short-circuits when an input value is `Some`.
   * If no `Some` is found, returns `None`.
   */
  export function any<T extends Maybe<any>[]>(
    ...options: T
  ): Maybe<MaybeValueTypes<T>[number]> {
    // short-circuits
    for (const option of options) {
      if (option.isValue) {
        return option as MaybeValue<MaybeValueTypes<T>[number]>;
      }
    }

    // it must be None
    return None;
  }
}
