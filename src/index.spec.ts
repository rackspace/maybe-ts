import { isMaybe, Maybe, NotFoundError } from "./index";

describe("maybe", () => {
  describe("with None", () => {
    test("factory asNone", () => {
      expect(Maybe.asNone()).toBe(Maybe.None);
    });

    test("functions", () => {
      expect(Maybe.None.isNone).toBe(true);
      expect(Maybe.None.isValue).toBe(false);
      expect(() => Maybe.None.unwrap()).toThrow();
      expect(Maybe.None.unwrapOr("hello")).toEqual("hello");
      expect(() => Maybe.None.unwrapOrThrow("hello")).toThrow();
      const myError = new Error("mine");
      expect(() => Maybe.None.unwrapOrThrow(myError)).toThrow(myError);
      expect(Maybe.None.unwrapOrNull()).toBeNull();
      expect(Maybe.None.map(() => true)).toBe(Maybe.None);
      expect(Maybe.None.mapOr("orThis", () => true)).toEqual("orThis");
      expect(
        Maybe.None.mapOrElse(
          () => "orElse",
          () => true,
        ),
      ).toEqual("orElse");
      expect(Maybe.None.andThen("ignored")).toBe(Maybe.None);
      expect(Maybe.None.toString()).toEqual("None");
    });

    test("iterator", () => {
      let index = 0;
      for (const _item of Maybe.None) {
        index++;
      }
      expect(index).toBe(0);
    });
  });

  describe("with NotFound", () => {
    test("factory notFound and unwrap", () => {
      const uut = Maybe.notFound("one", "two");
      expect(isMaybe(uut)).toBeTruthy();
      expect(uut.isNone).toBe(true);
      expect(() => uut.unwrap()).toThrow(
        new NotFoundError("NotFound: one two"),
      );
    });
  });

  describe("with Some value", () => {
    test("factory withValue / isMaybe", () => {
      const uut = Maybe.withValue("hi");
      expect(isMaybe(uut)).toBeTruthy();
    });

    test("functions", () => {
      const content = { id: "utest" };
      const uut = Maybe.withValue(content);
      expect(uut.isNone).toBe(false);
      expect(uut.isValue).toBe(true);
      expect(uut.unwrap()).toBe(content);
      expect(uut.unwrapOr("hello")).toBe(content);
      expect(uut.unwrapOrThrow("hello")).toBe(content);
      expect(uut.unwrapOrNull()).toBe(content);

      const mapValue = uut.map((value) => {
        expect(value).toBe(content);
        return true;
      });
      expect(mapValue.isValue).toBe(true);
      expect(mapValue.unwrap()).toBe(true);

      const mapOrValue = uut.mapOr("unused", (value) => {
        expect(value).toBe(content);
        return "mapped";
      });
      expect(mapOrValue).toBe("mapped");

      const mapOrElseValue = uut.mapOrElse(
        () => "unused",
        (value) => {
          expect(value).toBe(content);
          return "mapped";
        },
      );
      expect(mapOrElseValue).toBe("mapped");

      const andThenValue = uut.andThen((value) => {
        expect(value).toBe(content);
        return Maybe.Empty;
      });
      expect(andThenValue).toBe(Maybe.Empty);

      expect(uut.toString()).toEqual('Value({"id":"utest"})');
    });

    test("iterator on values", () => {
      let index = 0;
      for (const value of Maybe.withValue([1, 2])) {
        index++;
        expect(value).toBe(index);
      }
      expect(index).toBe(2);
    });

    test("iterator on Empty", () => {
      let index = 0;
      for (const _value of Maybe.Empty) {
        index++;
      }
      expect(index).toBe(0);
    });
  });
  describe("Maybe.wrap", () => {
    test("with values", () => {
      const num = Maybe.wrap(3);
      expect(num.isValue).toBe(true);
      expect(num.unwrap()).toBe(3);

      const content = { hello: "world" };
      const ob = Maybe.wrap(content);
      expect(ob.isValue).toBe(true);
      expect(ob.unwrap()).toBe(content);
    });

    test("with not-values", () => {
      expect(Maybe.wrap(null)).toBe(Maybe.None);
      expect(Maybe.wrap(undefined)).toBe(Maybe.None);
    });
  });

  describe("allOrNone", () => {
    test("with a None", () => {
      const maybe = Maybe.allOrNone(
        Maybe.Empty,
        Maybe.withValue(3),
        Maybe.None,
      );
      expect(maybe).toBe(Maybe.None);
    });

    test("with only values", () => {
      const maybe = Maybe.allOrNone(Maybe.Empty, Maybe.withValue(3));
      expect(maybe.unwrap()).toEqual([undefined, 3]);
    });
  });

  describe("allValues", () => {
    test("with a None", () => {
      const maybe = Maybe.allValues(
        Maybe.withValue(1),
        Maybe.None,
        Maybe.withValue(3),
      );
      expect(maybe).toEqual([1, 3]);
    });

    test("with only values", () => {
      const maybe = Maybe.allValues(Maybe.withValue(1), Maybe.withValue(3));
      expect(maybe).toEqual([1, 3]);
    });
  });

  describe("any", () => {
    test("with only None", () => {
      const maybe = Maybe.any(Maybe.asNone(), Maybe.None);
      expect(maybe).toBe(Maybe.None);
    });

    test("with values", () => {
      const maybe = Maybe.any(Maybe.withValue(3), Maybe.None, Maybe.empty());
      expect(maybe.unwrap()).toEqual(3);
    });
  });

  test("unwrap", () => {
    expect(Maybe.unwrap(Maybe.withValue(3))).toBe(3);
    expect(() => Maybe.unwrap(Maybe.None)).toThrow();
  });

  test("unwrapOrNull", () => {
    expect(Maybe.unwrapOrNull(Maybe.withValue(3))).toBe(3);
    expect(Maybe.unwrapOrNull(Maybe.None)).toBeNull();
  });
});
