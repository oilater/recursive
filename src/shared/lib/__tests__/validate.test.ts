import { describe, it, expect } from "vitest";
import { hasDuplicates, allPositiveIntegers, parseNumberArray, safeJsonParse } from "../validate";

describe("hasDuplicates", () => {
  it("중복이 있으면 true", () => expect(hasDuplicates([1, 2, 2])).toBe(true));
  it("중복이 없으면 false", () => expect(hasDuplicates([1, 2, 3])).toBe(false));
  it("빈 배열은 false", () => expect(hasDuplicates([])).toBe(false));
});

describe("allPositiveIntegers", () => {
  it("모두 양의 정수면 true", () => expect(allPositiveIntegers([1, 2, 3])).toBe(true));
  it("0이 포함되면 false", () => expect(allPositiveIntegers([0, 1, 2])).toBe(false));
  it("음수가 포함되면 false", () => expect(allPositiveIntegers([-1, 1])).toBe(false));
});

describe("parseNumberArray", () => {
  it("쉼표 구분 문자열을 파싱한다", () => expect(parseNumberArray("1, 2, 3")).toEqual([1, 2, 3]));
  it("공백 구분도 처리한다", () => expect(parseNumberArray("1 2 3")).toEqual([1, 2, 3]));
  it("빈 문자열은 null", () => expect(parseNumberArray("")).toBeNull());
  it("숫자가 아닌 값은 null", () => expect(parseNumberArray("a, b")).toBeNull());
});

describe("safeJsonParse", () => {
  it("유효한 JSON을 파싱한다", () => expect(safeJsonParse("[1,2,3]")).toEqual([1, 2, 3]));
  it("숫자를 파싱한다", () => expect(safeJsonParse("42")).toBe(42));
  it("유효하지 않으면 원본 문자열 반환", () => expect(safeJsonParse("hello")).toBe("hello"));
});
