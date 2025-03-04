import { Maybe } from "./maybe";
import { Result } from "./result";
import isResult = Result.isResult;

describe("Result", () => {
  describe("as Error", () => {
    test("has basic uses", () => {
      const uutError = new Error("Boom!");
      const otherError = new Error("Other");
      const uut = Result.error(uutError);

      expect(uut.isOkay).toBe(false);
      expect(uut.isError).toBe(true);

      expect(() => uut.expectOkay("Failed")).toThrow(
        /^Failed - Error: Boom!\n/,
      );
      expect(uut.expectError("ignore")).toEqual(uutError);

      expect(() => uut.unwrap()).toThrow(uutError);
      expect(uut.unwrapOr(3)).toBe(3);
      expect(uut.unwrapOrNull()).toBeNull();
      expect(() => uut.unwrapOrThrow()).toThrow(uutError);
      expect(() => uut.unwrapOrThrow(otherError)).toThrow(otherError);

      expect(uut.andThen(() => {})).toBe(uut);

      expect(uut.map(() => {})).toBe(uut);

      const mappedNotOkay = uut.mapOr(() => {}, otherError);
      expect(mappedNotOkay.expectError("expected error")).toEqual(otherError);

      const mappedError = uut.mapError(() => otherError);
      expect(mappedError.expectError("expected error")).toEqual(otherError);

      expect(uut.toMaybe()).toEqual(Maybe.None);
      expect(uut.toString()).toEqual("Error: Boom!");
      expect(uut.stack).toMatch(/^Error: Boom!\n/);

      const wrapToOkay = Result.okay(uut);
      expect(wrapToOkay.expectOkay("expected okay")).toEqual(uutError);
      const singleWrapError = Result.error(uut);
      expect(singleWrapError.expectError("unexpected")).toEqual(uutError);
    });

    test("has empty iterator", () => {
      let index = 0;
      for (const _item of Result.error(new Error())) {
        index++;
      }
      expect(index).toBe(0);
    });
  });

  describe("as Okay", () => {
    test("has basic uses", () => {
      const uutValue = { id: 2, name: "happy" };
      const otherError = new Error("Other");
      const uut = Result.okay(uutValue);

      expect(uut.isOkay).toBe(true);
      expect(uut.isError).toBe(false);

      expect(uut.expectOkay("ignore")).toEqual(uutValue);
      expect(() => uut.expectError("Failed")).toThrow(
        /^Failed - Okay: {"id":2,"name":"happy"}/,
      );

      expect(uut.unwrap()).toBe(uutValue);
      expect(uut.unwrapOr(3)).toBe(uutValue);
      expect(uut.unwrapOrNull()).toBe(uutValue);
      expect(uut.unwrapOrThrow()).toBe(uutValue);
      expect(uut.unwrapOrThrow(otherError)).toBe(uutValue);

      expect(
        uut.andThen((value) => Result.okay({ ...value, id: value.id + 1 })),
      ).toEqual(Result.okay({ id: 3, name: "happy" }));

      expect(uut.map((value) => value.id + 1)).toEqual(Result.okay(3));
      expect(uut.mapOr((value) => value.id + 2, otherError)).toEqual(
        Result.okay(4),
      );
      expect(uut.mapError(() => otherError)).toEqual(uut);
      expect(uut.safeUnwrap()).toEqual(uutValue);

      expect(uut.toMaybe()).toEqual(Maybe.withValue(uutValue));
      expect(uut.toString()).toEqual('Okay: {"id":2,"name":"happy"}');

      expect(Result.okay(uut)).toEqual(uut);
      const wrapToError = Result.error(uut);
      expect(wrapToError.expectError("unexpected")).toEqual(uutValue);
    });

    test("has void value", () => {
      const uut = Result.okayVoid();

      expect(uut.isOkay).toBe(true);
      expect(uut.isError).toBe(false);
      expect(uut.unwrap()).toBe(undefined);
      expect(uut.unwrapOrNull()).toBe(undefined);
      expect(uut.map(() => 3)).toEqual(Result.okay(3));
      expect(uut.safeUnwrap()).toEqual(undefined);

      expect(uut.toMaybe()).toEqual(Maybe.withValue(undefined));
      expect(uut.toString()).toEqual("Okay: undefined");
    });

    test("has iterator with values", () => {
      let index = 0;
      for (const _item of Result.okay([1, 2])) {
        index++;
      }
      expect(index).toBe(2);
    });
  });

  describe("all are okay", () => {
    test("with okay values", () => {
      const okay1 = Result.okayVoid();
      const okay2 = Result.okay(2);
      const okay3 = Result.okay("yes");

      expect(Result.all(okay1, okay2, okay3)).toEqual(
        Result.okay([undefined, 2, "yes"]),
      );
    });

    test("with an error value", () => {
      const okay1 = Result.okay("yes");
      const error2 = Result.error(new Error("no"));

      expect(Result.all(okay1, error2)).toEqual(error2);
    });
  });

  describe("any are okay", () => {
    test("with okay value", () => {
      const error1 = Result.error(new Error("no"));
      const okay2 = Result.okay("yes");

      expect(Result.any(error1, okay2)).toEqual(okay2);
    });

    test("with all error values", () => {
      const error1 = new Error("false");
      const error2 = new Error("no");

      const results = Result.any(Result.error(error1), Result.error(error2));
      expect(results.expectError("should be error")).toEqual([error1, error2]);
    });
  });

  describe("wrap a function", () => {
    test("when the function returns a value", () => {
      const result = Result.wrap(() => 42);
      expect(result.expectOkay("expected 42")).toBe(42);
    });

    test("when the function throws", () => {
      const result = Result.wrap(() => {
        throw new Error("Boom");
      });
      expect(result.expectError("expected to throw")).toEqual(
        new Error("Boom"),
      );
    });
  });

  describe("unwrap a Result", () => {
    test("when the Result is an error", () => {
      const uutError = new Error("Boom!");
      const uut = Result.error(uutError);
      expect(() => uut.unwrap()).toThrow(uutError);
    });

    test("when the Result is okay", () => {
      const uut = Result.okay(80);
      expect(uut.unwrap()).toBe(80);
    });
  });

  describe("wrap an async function", () => {
    test("when the function returns a value", async () => {
      const result = await Result.wrapAsync(() => Promise.resolve(42));
      expect(result.expectOkay("expected 42")).toBe(42);
    });

    test("when the function throws asynchronously", async () => {
      const result = await Result.wrapAsync(async () => {
        throw new Error("Boom");
      });
      expect(result.expectError("expected to throw")).toEqual(
        new Error("Boom"),
      );
    });

    test("when the function throws synchronously", async () => {
      const result = await Result.wrapAsync(() => {
        throw new Error("Boom");
      });
      expect(result.expectError("expected to throw")).toEqual(
        new Error("Boom"),
      );
    });
  });

  test("has type guard", () => {
    expect(isResult(Result.okay(1))).toBe(true);
    expect(isResult(Result.error(new Error()))).toBe(true);
    expect(isResult(1)).toBe(false);
    expect(isResult(new Error())).toBe(false);
  });
});
