import { describe, expect, it } from "vitest";
import { gridStepForView } from "./editor-ground";

describe("adaptive editor grid", () => {
  it("uses metre cells nearby and coarser cells when zooming out", () => {
    expect(gridStepForView(8, 0.8, 800)).toBe(1);
    expect(gridStepForView(1000, 0.8, 800)).toBe(50);
    expect(gridStepForView(100, 0.8, 300)).toBeGreaterThan(gridStepForView(100, 0.8, 1000));
  });
  it("keeps finite 1/2/5 spacing even with a temporarily collapsed viewport", () => {
    for (const radius of [1, 10, 38, 200, 1500]) {
      for (const height of [0, 1, 300, 1080]) {
        const step = gridStepForView(radius, 0.8, height);
        const fraction = step / 10 ** Math.floor(Math.log10(step));
        expect(step).toBeGreaterThanOrEqual(1);
        expect([1, 2, 5]).toContain(fraction);
      }
    }
  });
});
