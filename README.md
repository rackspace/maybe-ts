# maybe-result - Safe function return handling without null and undefined in Typescript and Javascript

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

## Example by story

You might have defined a data repository class (access to a data store) like this:

```ts
class WidgetRepository {
  get(widgetID: string): Promise<Widget> {
    // implementation ...
  }
}
```

If the Widget isn't found, you throw a `NotFoundError`. All is well, until you start _expecting_
a Widget not to be found. That becomes valid flow, so you find yourself writing this a lot:

```ts
  let widget: Widget | undefined;
  try {
    widget = await repo.get(widgetID);
  }
  catch (error) {
    if (!(error instanceof NotFoundError)) {
      throw error;
    }
  }
  
  if (widget) { /* ... */ }
```

You may be willing to do that once... but not more. So you first try to change the repository:

```ts
class WidgetRepository {
  get(widgetID: string): Promise<Widget | undefined> {
    // implementation ...
  }
}
```

Now it returns `undefined` instead of throwing. Oh, but what a hassle now you have to _check_ for
`undefined` _every time_ you call the function! So instead, you define _two_ functions:

```ts
class WidgetRepository {
  getOrThrow(widgetID: string): Promise<Widget> {
    // implementation ...
  }
  getIfFound(widgetID: string): Promise<Widget | undefined> {
    // implementation ...
  }
}
```

That makes it easier. It works. You just have to write _two_ functions every time you write a get function. 🙄

**OR...** use Maybe

```ts
class WidgetRepository {
  get(widgetID: string): PromiseMaybe<Widget> {
    // implementation ...
  }
}

// One place elsewhere where you want to throw if not found
const widget = Maybe.unwrap(await get(widgetID));

// Another place elsewhere where you want to handle the mising lookup
const widget = Maybe.unwrapOrNull(await get(widgetID));
if (widget) {
  // do work
} else {
  // do other work
}

// Someplace where you have a default
const widget = (await get(widgetID)).unwrapOr(defaultWidget);
```

There are many other functions both on the `Maybe` instance and static helper functions in
the `Maybe` namespace.

## API Use

[API Documentation](https://www.jsdocs.io/package/maybe-result)

See the [unit test suite](src/index.spec.ts) for usage examples.

## Origin and Alternatives

This implementation is based on `Option` from [ts-results](https://github.com/vultix/ts-results),
which adheres to the Rust API. 
This library has more natual word choices, Promise support, and other enhancements.

There are many other libraries that do this same thing - just
[search NPM for "maybe"](https://www.npmjs.com/search?q=maybe).
It is up to you to decide which option is best for your project.

**The goal of this "maybe" is to be featureful, safe, and easy to understand without 
a study of functional programming.**
