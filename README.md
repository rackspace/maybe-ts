# maybe-ts - Safe handling of null and undefined in Typescript and Javascript

## Introduction

In many languages, we have concepts of exceptions but also a `null` value of some sort.
(JavaScript has both `null` and `undefined`. Ugh!)

Often a function will need to indicate when a value _maybe_ exists, or it does not.
In JavaScript, the "does not" is usually returned as `undefined` or `null`, but sometimes
a function will *throw* an `Error` type instead. Thus, the developer needs to figure out
how that particular function behaves and adapt to that if they want to handle
the missing value.

Finally, throwing Errors in TypeScript can be expensive, as a stack trace must be
generated and cross-referenced to the `.js.map` files. These stack traces to your
TypeScript source are immensely useful to trace actual errors, but are wasted
processing when ignored.

The `Maybe` type makes this cleaner. Elm was an early language that defined this.
Rust has an `Option` type, which is the same concept.

A `Maybe` is a wrapper object that contains either "some" value, or "none".
A function can thus return a `Maybe`, and the client can then _choose_ how to handle
the possibly missing value. The caller can explicitly check for `isValue` or
`isNone`, or can simply `unwrap` the `Maybe` and let it throw an error if "none".
It is now the caller's choice. There are many other helper functions too, such as
to unwrap with a default value to return in place of throwing if `isNone`.

This is not an "anti-throw" utility like Rust's `Result` type is.
In JavaScript we like to throw `Error` types, but in other languages we call these _exceptions_.
**Throwing is still good for _exceptional_ cases. `Maybe` is for "normal" control flows.**

Here's a nice introduction to the concept:
[Implementing a Maybe Pattern using a TypeScript Type Guard](https://medium.com/@sitapati/implementing-a-maybe-pattern-using-a-typescript-type-guard-81b55efc0af0)

## Origin and Alternatives

This implementation is based on `Option` from [ts-results](https://github.com/vultix/ts-results),
which adheres to the Rust API. 
This library has more natual word choices, Promise support, and other enhancements.

There are many other libraries that do this same thing - just
[search NPM for "maybe"](https://www.npmjs.com/search?q=maybe).
It is up to you to decide which option is best for your project.

**The goal of this "maybe" is to be featureful, safe, and easy to understand without 
a study of functional programming.**

## API Use

[API Documentation](https://www.jsdocs.io/package/maybe-ts)

See the [unit test suite](src/index.spec.ts) for usage examples.
