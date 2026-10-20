import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VectorFields } from "./editor-fields";

describe("compact coordinate inspector", () => {
  it("shows short axis labels while retaining descriptive accessible input names", () => {
    const html = renderToStaticMarkup(
      createElement(VectorFields, {
        label: "Vị trí",
        unit: "m",
        value: { x: -14, y: 0.5, z: 7.5 },
        onChange() {},
      }),
    );
    for (const axis of ["X", "Y", "Z"]) {
      expect(html).toContain(`<span title="Vị trí ${axis}">${axis}</span>`);
      expect(html).toContain(`aria-label="Vị trí ${axis}"`);
    }
    expect(html).toContain("<small>m</small>");
    expect(html).toContain('value="-14"');
  });
  it("retains locked state and positive scale constraints", () => {
    const html = renderToStaticMarkup(
      createElement(VectorFields, {
        label: "Tỷ lệ",
        scale: true,
        disabled: true,
        value: { x: 1, y: 2, z: 3 },
        onChange() {},
      }),
    );
    expect(html).toContain('disabled=""');
    expect(html).toContain('min="0.01"');
    expect(html).toContain('max="1000"');
  });
});
