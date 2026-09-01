import { describe, expect, it } from "vitest";
import {
  coverageForRange,
  percentagePointChange,
  ratePercent,
} from "../../scripts/weekly-analytics-metrics.mjs";

describe("weekly analytics metrics", () => {
  it("marks a range that started collecting midway as incomplete", () => {
    expect(
      coverageForRange("2026-08-17", "2026-08-24", "2026-08-20"),
    ).toEqual({ covered: 4, total: 7, complete: false });
  });

  it("marks a fully collected range as complete", () => {
    expect(
      coverageForRange("2026-08-24", "2026-08-31", "2026-08-20"),
    ).toEqual({ covered: 7, total: 7, complete: true });
  });

  it("calculates matched-denominator rates and point changes", () => {
    expect(ratePercent(15, 137)).toBeCloseTo(10.95);
    expect(ratePercent(0, 0)).toBeNull();
    expect(percentagePointChange(17.1, 11.8)).toBeCloseTo(5.3);
    expect(percentagePointChange(null, 11.8)).toBeNull();
  });
});
