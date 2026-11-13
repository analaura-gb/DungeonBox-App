import { describe, expect, it } from "vitest";
import { fmtTime } from "./format";

describe("fmtTime", () => {
  it("formats seconds as minutes and two-digit seconds", () => {
    expect(fmtTime(0)).toBe("0:00");
    expect(fmtTime(65)).toBe("1:05");
    expect(fmtTime(600)).toBe("10:00");
  });

  it("drops the fraction of a second", () => {
    expect(fmtTime(59.9)).toBe("0:59");
  });
});
