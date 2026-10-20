import { Color3, TransformNode } from "@babylonjs/core";
import type { PrefabKey } from "@lw/shared/map-layout";
import type { LowPolyKit } from "./low-poly-kit";

/**
 * Mẫu low-poly có sẵn cho World Studio (và sau này cho bản đồ trong game): cây, đá, đường lát,
 * hồ, đèn, ghế, rào, nhà, quầy chợ, giếng, thùng gỗ.
 *
 * Mọi mẫu dựng trong hệ tọa độ của `n` (gốc ở tâm đáy, mặt trước nhìn về -z), kích thước tính bằng mét.
 * `color` là màu chính; các màu phụ suy ra từ nó (đậm hơn / nhạt hơn) để vẫn hài hòa khi đổi màu.
 */

const shade = (hex: string, amount: number) => {
  const c = Color3.FromHexString(hex);
  const t = amount < 0 ? Color3.Black() : Color3.White();
  return Color3.Lerp(c, t, Math.abs(amount)).toHexString();
};

const WOOD = "#8a5a2b";
const WOOD_LIGHT = "#b9824a";
const TRUNK = "#7a4a2a";
const STONE = "#dccdb0";
const BLACK = "#1d1d1f";

export function buildPrefab(kit: LowPolyKit, key: PrefabKey, color: string, n: TransformNode) {
  switch (key) {
    case "tree": {
      kit.cylinder({ height: 1.2, top: 0.24, bottom: 0.34, sides: 6 }, TRUNK, {
        parent: n,
        position: [0, 0.6, 0],
      });
      kit.ball(1.05, color, { parent: n, position: [0, 1.85, 0] });
      kit.ball(0.75, shade(color, 0.18), { parent: n, position: [0.4, 2.45, -0.25] });
      kit.ball(0.6, shade(color, -0.15), { parent: n, position: [-0.45, 2.3, 0.3] });
      return;
    }
    case "pine": {
      kit.cylinder({ height: 0.8, top: 0.2, bottom: 0.26, sides: 5 }, TRUNK, {
        parent: n,
        position: [0, 0.4, 0],
      });
      kit.cone({ height: 1.9, diameter: 2, sides: 7 }, shade(color, -0.1), {
        parent: n,
        position: [0, 1.6, 0],
      });
      kit.cone({ height: 1.5, diameter: 1.45, sides: 7 }, color, { parent: n, position: [0, 2.6, 0] });
      kit.cone({ height: 1, diameter: 0.9, sides: 7 }, shade(color, 0.2), {
        parent: n,
        position: [0, 3.4, 0],
      });
      return;
    }
    case "bush": {
      kit.ball(0.6, color, { parent: n, position: [0, 0.4, 0], scaling: [1.25, 0.8, 1] });
      kit.ball(0.4, shade(color, 0.15), { parent: n, position: [0.45, 0.35, 0.1] });
      for (const [x, z, c] of [
        [-0.3, -0.45, "#f26d8f"],
        [0.25, -0.5, "#ffd34d"],
        [0.05, -0.2, "#f26d8f"],
      ] as const)
        kit.ball(0.12, c, { parent: n, position: [x, 0.72, z] }, 0);
      return;
    }
    case "flowers": {
      kit.box([2, 0.35, 1], "#7a5232", { parent: n, position: [0, 0.17, 0] });
      kit.box([2.1, 0.12, 1.1], STONE, { parent: n, position: [0, 0.3, 0] });
      const colors = [color, "#ffd34d", shade(color, 0.3), "#c86bfa", "#ff8a3d"];
      for (let i = 0; i < 10; i++)
        kit.ball(
          0.17,
          colors[i % colors.length],
          {
            parent: n,
            position: [-0.8 + (i % 5) * 0.4, 0.5, i < 5 ? -0.22 : 0.22],
          },
          0,
        );
      return;
    }
    case "rock": {
      kit.ball(0.7, color, { parent: n, position: [0, 0.4, 0], scaling: [1.3, 0.75, 1] }, 0);
      kit.ball(0.45, shade(color, -0.15), { parent: n, position: [0.65, 0.25, 0.3] }, 0);
      kit.ball(0.3, shade(color, 0.15), { parent: n, position: [-0.6, 0.18, -0.35] }, 0);
      return;
    }
    case "path": {
      // Ô đường lát đá 2 x 2 m, ghép liền nhau thành đường.
      kit.box([2, 0.06, 2], shade(color, -0.2), { parent: n, position: [0, 0.03, 0] });
      kit.box([1.9, 0.08, 1.9], color, { parent: n, position: [0, 0.05, 0] });
      for (const [x, z, r] of [
        [-0.45, -0.5, 0.3],
        [0.5, 0.1, 1.1],
        [-0.2, 0.55, 0.7],
      ] as const)
        kit.box([0.5, 0.09, 0.38], shade(color, 0.12), {
          parent: n,
          position: [x, 0.055, z],
          rotation: [0, r, 0],
        });
      return;
    }
    case "pond": {
      kit.cylinder({ height: 0.25, top: 4.4, sides: 12 }, STONE, { parent: n, position: [0, 0.12, 0] });
      kit.cylinder(
        { height: 0.1, top: 3.8, sides: 12 },
        color,
        { parent: n, position: [0, 0.22, 0] },
        { glow: 0.25 },
      );
      for (const [x, z] of [
        [1.6, 0.9],
        [-1.4, -1.2],
      ])
        kit.cone({ height: 0.9, diameter: 0.35, sides: 5 }, "#3e8f39", { parent: n, position: [x, 0.5, z] });
      kit.cylinder({ height: 0.05, top: 0.6, sides: 8 }, "#5fb33f", {
        parent: n,
        position: [0.6, 0.29, -0.5],
      });
      return;
    }
    case "lamp": {
      kit.cylinder({ height: 0.25, top: 0.34, bottom: 0.4, sides: 6 }, BLACK, {
        parent: n,
        position: [0, 0.13, 0],
      });
      kit.cylinder({ height: 3, top: 0.1, bottom: 0.15, sides: 6 }, BLACK, {
        parent: n,
        position: [0, 1.5, 0],
      });
      kit.box([0.42, 0.5, 0.42], "#ffe9a8", { parent: n, position: [0, 3.2, 0] }, { glow: 1 });
      kit.cone({ height: 0.36, diameter: 0.66, sides: 4 }, BLACK, {
        parent: n,
        position: [0, 3.63, 0],
        rotation: [0, Math.PI / 4, 0],
      });
      kit.box([0.05, 0.05, 0.8], BLACK, { parent: n, position: [0, 2.6, 0.4] });
      kit.box([0.04, 0.9, 0.55], color, { parent: n, position: [0, 2.12, 0.5] });
      kit.box([0.05, 0.12, 0.55], "#f0b93a", { parent: n, position: [0, 2.45, 0.5] });
      return;
    }
    case "bench": {
      kit.box([1.7, 0.1, 0.5], color, { parent: n, position: [0, 0.5, 0] });
      kit.box([1.7, 0.42, 0.08], color, { parent: n, position: [0, 0.8, 0.24] });
      for (const side of [-0.7, 0.7])
        kit.box([0.08, 0.5, 0.45], BLACK, { parent: n, position: [side, 0.25, 0] });
      return;
    }
    case "fence": {
      // Đoạn rào 2 m, ghép nối dọc trục x.
      for (const x of [-0.95, 0, 0.95])
        kit.box([0.14, 0.85, 0.14], color, { parent: n, position: [x, 0.42, 0] });
      for (const y of [0.35, 0.65])
        kit.box([2, 0.08, 0.06], shade(color, -0.25), { parent: n, position: [0, y, 0] });
      return;
    }
    case "house": {
      kit.box([3.4, 2.6, 4], color, { parent: n, position: [0, 1.3, 0] });
      kit.roof({ length: 3.7, width: 4.3, height: 1.4 }, "#cc4630", { parent: n, position: [0, 2.6, 0] });
      kit.box([0.45, 1.1, 0.45], "#93392b", { parent: n, position: [1.1, 3.6, 0.8] });
      kit.box([0.8, 1.6, 0.1], "#2f6db3", { parent: n, position: [-0.7, 0.8, -2.05] });
      kit.box([1, 0.9, 0.08], "#f7f2e6", { parent: n, position: [0.8, 1.3, -2.02] });
      kit.box([0.8, 0.7, 0.09], "#9fd3ea", { parent: n, position: [0.8, 1.3, -2.06] }, { glow: 0.35 });
      return;
    }
    case "stall": {
      kit.box([2.6, 0.95, 1.2], WOOD, { parent: n, position: [0, 0.48, 0] });
      kit.box([2.7, 0.08, 1.3], WOOD_LIGHT, { parent: n, position: [0, 0.98, 0] });
      for (const [x, z] of [
        [-1.2, -0.6],
        [1.2, -0.6],
        [-1.2, 1],
        [1.2, 1],
      ])
        kit.cylinder({ height: 2.4, top: 0.1, sides: 5 }, WOOD_LIGHT, { parent: n, position: [x, 1.2, z] });
      for (let i = 0; i < 6; i++)
        kit.box([0.47, 0.08, 2.1], i % 2 ? "#f7f2e6" : color, {
          parent: n,
          position: [-1.17 + i * 0.47, 2.45, 0.2],
          rotation: [-0.3, 0, 0],
        });
      for (let i = 0; i < 3; i++)
        for (let k = 0; k < 3; k++)
          kit.ball(
            0.13,
            ["#e0413c", "#ff9a2e", "#6ab04c"][i],
            { parent: n, position: [-0.8 + i * 0.8 + (k - 1) * 0.15, 1.15, -0.1 + (k % 2) * 0.15] },
            0,
          );
      return;
    }
    case "well": {
      kit.cylinder({ height: 0.9, top: 1.8, bottom: 1.9, sides: 10 }, color, {
        parent: n,
        position: [0, 0.45, 0],
      });
      kit.cylinder(
        { height: 0.05, top: 1.4, sides: 10 },
        "#3d9fd9",
        { parent: n, position: [0, 0.85, 0] },
        { glow: 0.2 },
      );
      for (const x of [-0.85, 0.85]) kit.box([0.15, 1.8, 0.15], WOOD, { parent: n, position: [x, 1.6, 0] });
      kit.roof({ length: 2.2, width: 1.6, height: 0.8 }, "#cc4630", { parent: n, position: [0, 2.45, 0] });
      kit.cylinder({ height: 1.6, top: 0.12, sides: 6 }, WOOD_LIGHT, {
        parent: n,
        position: [0, 2.1, 0],
        rotation: [0, 0, Math.PI / 2],
      });
      return;
    }
    case "barrel": {
      kit.cylinder({ height: 1, top: 0.6, bottom: 0.7, sides: 8 }, color, {
        parent: n,
        position: [0, 0.5, 0],
      });
      for (const y of [0.2, 0.8])
        kit.cylinder({ height: 0.07, top: 0.7, sides: 8 }, "#5b6475", { parent: n, position: [0, y, 0] });
      kit.box([0.8, 0.7, 0.8], WOOD_LIGHT, { parent: n, position: [0.9, 0.35, 0.2] });
      return;
    }
  }
}
