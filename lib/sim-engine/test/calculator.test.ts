// The shared engine must give exactly the results of the calculator it was
// moved from (artifacts/simdouane/src/lib/calculator.ts): every field, to the
// last bit, on a grid of cylindrées × régimes × values, days and years.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { calculate } from "../src";
import { GOLDEN } from "./golden";

describe("@workspace/sim-engine", () => {
  // The vehicle age (and so the risk level) depends on the current year:
  // the reference results were computed in 2026.
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  it("couvre les 6 cylindrées et les 3 régimes", () => {
    expect(new Set(GOLDEN.map(([i]) => i.cylindree)).size).toBe(6);
    expect(new Set(GOLDEN.map(([i]) => i.regime)).size).toBe(3);
  });

  it.each(GOLDEN.map(([input, result], n) => [n, input, result] as const))(
    "cas %i : résultats identiques à l'ancien calculateur",
    (_n, input, expected) => {
      expect(calculate(input)).toStrictEqual(expected);
    },
  );
});
