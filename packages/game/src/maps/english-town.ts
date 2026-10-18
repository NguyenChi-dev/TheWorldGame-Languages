import {
  Color3,
  MeshBuilder,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
  VertexBuffer,
} from "@babylonjs/core";
import { TOWN_PLACES, type TownPlaceKey } from "@lw/shared";
import type { LifeSpots } from "../scene/ambient-life";
import { LowPolyKit } from "./low-poly-kit";
import { PlaceSign } from "./place-sign";
import { WalkGrid, type Point, type Rect } from "./walk-grid";

/**
 * Bản đồ vùng đất Tiếng Anh: thị trấn cổ tích kiểu 3D low-poly trên một hòn đảo.
 *
 *   bắc   z = 48 ┌───────────────────────────────────────────────┐
 *                │  TRƯỜNG HỌC      THƯ VIỆN        CHỢ   ▲ LÂU ĐÀI│ (cao nguyên + thác nước)
 *                │                                         ║ sông │
 *                │  QUÁN CÀ PHÊ    ( QUẢNG TRƯỜNG )   RẠP PHIM ║   │
 *         z = -10│ ≈≈≈≈cầu≈≈≈≈≈≈≈≈≈≈≈≈cầu≈≈≈≈≈≈≈≈≈≈≈≈cầu≈≈≈≈≈≈╝   │ kênh nước
 *                │  NÔNG TRẠI       BƯU ĐIỆN        TRẠM XE BUÝT   │
 *                │  (cối xay gió)    bến tàu ⛵           (hải đăng) │
 *   nam   z = -40└───────────────────────────────────────────────┘ biển
 *              x = -48                    0                     48
 *
 * Đường lát đá uốn lượn từ quảng trường tỏa ra từng địa điểm (chỉ để nhìn: nhân vật đi tự do khắp
 * đảo, chỉ không đi xuyên nhà, cây, nước; qua kênh bằng 3 cây cầu). Mọi nhà quay mặt về phía nam
 * (phía camera). Mỗi địa điểm có "chỗ đứng" ngay trước cửa; tới gần chỗ đó là "đã tới".
 */

export const TOWN_HALF_EXTENT = 48;
/** Bờ biển phía nam (đảo trải từ z = SOUTH_SHORE tới z = 48). */
const SOUTH_SHORE = -40;

export interface TownPlace {
  key: TownPlaceKey;
  /** Chỗ nhân vật đứng khi tới nơi (ngay trước cửa). */
  spot: Point;
  /** Hướng nhìn vào cửa khi đứng ở chỗ đứng. */
  facing: Point;
}

export interface TownMap {
  /** Ô nào đi được, tìm đường vòng qua vật cản. */
  grid: WalkGrid;
  places: TownPlace[];
  spawn: Point;
  /** Mesh bấm được để chọn địa điểm (khối vô hình bao quanh nhà + biển tên). */
  isPlaceMesh: (mesh: { metadata?: unknown }) => TownPlaceKey | null;
  /** Vẽ lại chữ trên biển tên (khi font web vừa tải xong). */
  redrawSigns: () => void;
  /** Làm nổi bật một địa điểm (rê chuột lên): viền sáng, vòng sáng dưới đất, biển tên to. null: tắt. */
  highlight: (place: TownPlaceKey | null) => void;
  /** Chỗ đặt hiệu ứng sống động (tia nước, bụi thác, khói...). */
  life: LifeSpots;
}

// -----------------------------------------------------------------------------
// Màu (tươi, ấm như tranh minh họa)
// -----------------------------------------------------------------------------
const C = {
  grass: "#86cf5c",
  grassDark: "#6dba49",
  rock: "#8d8070",
  rockDark: "#6f6457",
  sand: "#f0d9a0",
  path: "#e9c98f",
  pathEdge: "#c79f68",
  plaza: "#eed4a2",
  brick: "#c4563f",
  brickDark: "#93392b",
  cream: "#f3e6c8",
  stone: "#dccdb0",
  stoneDark: "#b9a98c",
  castle: "#d9d3c7",
  roofBlue: "#2f5cb0",
  roofRed: "#cc4630",
  white: "#f7f2e6",
  navy: "#26365e",
  glass: "#9fd3ea",
  red: "#d0202e",
  green: "#2f7a43",
  gold: "#f0b93a",
  black: "#1d1d1f",
  wood: "#8a5a2b",
  woodLight: "#b9824a",
  trunk: "#7a4a2a",
  leaf: "#4fae45",
  leafLight: "#6cc44f",
  leafDark: "#3e8f39",
  water: "#3d9fd9",
  waterDeep: "#2b86c4",
  foam: "#dff4ff",
};

/** Hình chữ nhật thẳng trục (tâm x, z). */
const rect = (x: number, z: number, width: number, depth: number): Rect => ({ x, z, width, depth });

/** Vật cản gom trong lúc dựng (cây, đèn, nước...), ghi vào lưới đi lại khi dựng xong. */
let blockers: Rect[] = [];

/** Số giả ngẫu nhiên lặp lại được (mọi máy thấy cùng một thị trấn). */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// -----------------------------------------------------------------------------
// Chi tiết dùng chung
// -----------------------------------------------------------------------------

/** Cửa sổ có khung trắng ở mặt trước (mặt trước nhà nằm ở z = front). */
function window_(
  kit: LowPolyKit,
  parent: TransformNode,
  x: number,
  y: number,
  front: number,
  w = 0.8,
  h = 1,
) {
  kit.box([w + 0.18, h + 0.18, 0.08], C.white, { parent, position: [x, y, front - 0.03] });
  kit.box([w, h, 0.08], C.glass, { parent, position: [x, y, front - 0.07] }, { glow: 0.4 });
  kit.box([0.06, h, 0.09], C.white, { parent, position: [x, y, front - 0.08] });
  kit.box([w + 0.3, 0.1, 0.18], C.white, { parent, position: [x, y - h / 2 - 0.1, front - 0.1] });
}

function door(
  kit: LowPolyKit,
  parent: TransformNode,
  x: number,
  front: number,
  color: string,
  w = 1.1,
  h = 2,
) {
  kit.box([w + 0.24, h + 0.14, 0.1], C.white, { parent, position: [x, h / 2 + 0.05, front - 0.03] });
  kit.box([w, h, 0.1], color, { parent, position: [x, h / 2, front - 0.07] });
  kit.ball(0.05, C.gold, { parent, position: [x + w * 0.32, h * 0.48, front - 0.14] }, 0);
}

/** Góc ngẫu nhiên nhưng cố định theo vị trí (mỗi cây một dáng, mọi máy thấy giống nhau). */
const angleAt = (x: number, z: number) =>
  Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % (Math.PI * 2);

function tree(kit: LowPolyKit, x: number, z: number, size = 1, shade = 0) {
  blockers.push(rect(x, z, 0.6 * size, 0.6 * size));
  const a = angleAt(x, z);
  const lean = Math.sin(a * 3) * 0.08;
  const off = (dx: number, dz: number): [number, number] => [
    x + (dx * Math.cos(a) - dz * Math.sin(a)) * size,
    z + (dx * Math.sin(a) + dz * Math.cos(a)) * size,
  ];
  kit.cylinder({ height: 1.2 * size, top: 0.24 * size, bottom: 0.34 * size, sides: 6 }, C.trunk, {
    position: [x, 0.6 * size, z],
    rotation: [lean, a, 0],
  });
  const leaves = [C.leaf, C.leafLight, C.leafDark];
  const [x1, z1] = off(0.4, -0.25);
  const [x2, z2] = off(-0.45, 0.3);
  kit.ball(1.05 * size, leaves[shade % 3], { position: [x, 1.85 * size, z], rotation: [lean, a, 0] });
  kit.ball(0.75 * size, leaves[(shade + 1) % 3], { position: [x1, 2.45 * size, z1], rotation: [0, a, lean] });
  kit.ball(0.6 * size, leaves[(shade + 2) % 3], { position: [x2, 2.3 * size, z2], rotation: [lean, -a, 0] });
}

function pine(kit: LowPolyKit, x: number, z: number, size = 1) {
  blockers.push(rect(x, z, 0.6 * size, 0.6 * size));
  const a = angleAt(x, z);
  kit.cylinder({ height: 0.8 * size, top: 0.2 * size, bottom: 0.26 * size, sides: 5 }, C.trunk, {
    position: [x, 0.4 * size, z],
  });
  kit.cone({ height: 1.9 * size, diameter: 2 * size, sides: 7 }, C.leafDark, {
    position: [x, 1.6 * size, z],
    rotation: [0, a, 0],
  });
  kit.cone({ height: 1.5 * size, diameter: 1.45 * size, sides: 7 }, C.leaf, {
    position: [x, 2.6 * size, z],
    rotation: [0, a * 2, 0],
  });
  kit.cone({ height: 1.0 * size, diameter: 0.9 * size, sides: 7 }, C.leafLight, {
    position: [x, 3.4 * size, z],
    rotation: [0, a * 3, 0],
  });
}

function bush(kit: LowPolyKit, x: number, z: number, size = 1, flower?: string) {
  kit.ball(0.55 * size, C.leafDark, { position: [x, 0.35 * size, z], scaling: [1.2, 0.8, 1] });
  if (flower)
    for (const [dx, dz] of [
      [-0.3, -0.35],
      [0.25, -0.4],
      [0.05, -0.15],
    ])
      kit.ball(0.11, flower, { position: [x + dx * size, 0.65 * size, z + dz * size] }, 0);
}

/** Cột đèn đường kiểu cổ, có cờ đuôi nheo xanh. */
function lamp(kit: LowPolyKit, x: number, z: number, banner = true) {
  blockers.push(rect(x, z, 0.25, 0.25));
  kit.cylinder({ height: 0.25, top: 0.34, bottom: 0.4, sides: 6 }, C.black, { position: [x, 0.13, z] });
  kit.cylinder({ height: 3, top: 0.1, bottom: 0.15, sides: 6 }, C.black, { position: [x, 1.5, z] });
  kit.box([0.42, 0.5, 0.42], "#ffe9a8", { position: [x, 3.2, z] }, { glow: 1 });
  kit.cone({ height: 0.36, diameter: 0.66, sides: 4 }, C.black, {
    position: [x, 3.63, z],
    rotation: [0, Math.PI / 4, 0],
  });
  if (banner) {
    kit.box([0.05, 0.05, 0.8], C.black, { position: [x, 2.6, z + 0.4] });
    kit.box([0.04, 0.9, 0.55], C.roofBlue, { position: [x, 2.12, z + 0.5] });
    kit.box([0.05, 0.12, 0.55], C.gold, { position: [x, 2.45, z + 0.5] });
  }
}

function bench(kit: LowPolyKit, x: number, z: number, rotationY = 0) {
  const node = new TransformNode("bench", kit.scene);
  node.position.set(x, 0, z);
  node.rotation.y = rotationY;
  kit.box([1.7, 0.1, 0.5], C.woodLight, { parent: node, position: [0, 0.5, 0] });
  kit.box([1.7, 0.42, 0.08], C.woodLight, { parent: node, position: [0, 0.8, 0.24] });
  for (const side of [-0.7, 0.7])
    kit.box([0.08, 0.5, 0.45], C.black, { parent: node, position: [side, 0.25, 0] });
  blockers.push(rect(x, z, 1.6, 0.6));
}

/** Mái hiên sọc 2 màu, nghiêng xuống phía trước. */
function awning(
  kit: LowPolyKit,
  parent: TransformNode,
  x: number,
  y: number,
  z: number,
  width: number,
  colors: [string, string],
  depth = 1.4,
) {
  const stripes = Math.max(2, Math.round(width / 0.45));
  const w = width / stripes;
  for (let i = 0; i < stripes; i++)
    kit.box([w, 0.08, depth], colors[i % 2], {
      parent,
      position: [x - width / 2 + w * (i + 0.5), y, z],
      rotation: [-0.34, 0, 0],
    });
  // Mép rủ có răng cưa.
  for (let i = 0; i < stripes; i++)
    kit.box([w * 0.8, 0.22, 0.05], colors[i % 2], {
      parent,
      position: [x - width / 2 + w * (i + 0.5), y - 0.35, z - depth / 2 - 0.05],
    });
}

/** Ô dù sọc đỏ trắng + bàn + 2 ghế. */
function umbrellaTable(kit: LowPolyKit, parent: TransformNode, x: number, z: number) {
  kit.cylinder({ height: 0.06, top: 0.9, sides: 10 }, C.white, { parent, position: [x, 0.75, z] });
  kit.cylinder({ height: 0.75, top: 0.08, sides: 5 }, C.black, { parent, position: [x, 0.37, z] });
  kit.cylinder({ height: 2, top: 0.05, sides: 5 }, C.white, { parent, position: [x, 1.45, z] });
  // Tán dù: nón 8 mặt đỏ, viền trắng, chóp trắng.
  kit.cone({ height: 0.65, diameter: 2.2, sides: 8 }, C.red, { parent, position: [x, 2.45, z] });
  kit.cylinder({ height: 0.12, top: 2.25, bottom: 2.3, sides: 8 }, C.white, {
    parent,
    position: [x, 2.14, z],
  });
  kit.ball(0.12, C.white, { parent, position: [x, 2.8, z] }, 0);
  for (const dx of [-0.65, 0.65])
    kit.box([0.38, 0.45, 0.38], C.woodLight, { parent, position: [x + dx, 0.23, z] });
}

/** Hàng rào gỗ thẳng từ (x1, z1) tới (x2, z2) trong hệ tọa độ của `parent`. */
function fence(
  kit: LowPolyKit,
  parent: TransformNode | undefined,
  x1: number,
  z1: number,
  x2: number,
  z2: number,
) {
  const length = Math.hypot(x2 - x1, z2 - z1);
  const angle = Math.atan2(x2 - x1, z2 - z1);
  const posts = Math.max(2, Math.round(length / 1.1) + 1);
  for (let i = 0; i < posts; i++) {
    const t = i / (posts - 1);
    kit.box([0.14, 0.85, 0.14], C.woodLight, {
      parent,
      position: [x1 + (x2 - x1) * t, 0.42, z1 + (z2 - z1) * t],
    });
  }
  for (const y of [0.35, 0.65])
    kit.box([0.06, 0.08, length], C.wood, {
      parent,
      position: [(x1 + x2) / 2, y, (z1 + z2) / 2],
      rotation: [0, angle, 0],
    });
}

// -----------------------------------------------------------------------------
// Địa điểm. Mỗi hàm dựng trong hệ tọa độ của nhà: tâm ở gốc, mặt trước nhìn về -z (phía camera).
// -----------------------------------------------------------------------------

function buildSquare(kit: LowPolyKit, n: TransformNode) {
  // Quảng trường tròn lát đá, vòng hoa văn.
  kit.cylinder({ height: 0.1, top: 19, sides: 28 }, C.pathEdge, { parent: n, position: [0, 0.05, 0] });
  kit.cylinder({ height: 0.12, top: 18, sides: 28 }, C.plaza, { parent: n, position: [0, 0.06, 0] });
  kit.cylinder({ height: 0.13, top: 11, sides: 24 }, "#d8c69c", { parent: n, position: [0, 0.065, 0] });
  kit.cylinder({ height: 0.14, top: 10, sides: 24 }, C.plaza, { parent: n, position: [0, 0.07, 0] });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    kit.box([0.5, 0.15, 1.6], "#d0bc90", {
      parent: n,
      position: [Math.sin(a) * 7.2, 0.075, Math.cos(a) * 7.2],
      rotation: [0, a, 0],
    });
  }
  // Đài phun nước 2 tầng + tượng vàng trên đỉnh.
  kit.cylinder({ height: 0.7, top: 5.6, bottom: 5.9, sides: 16 }, C.stone, {
    parent: n,
    position: [0, 0.35, 0],
  });
  kit.cylinder(
    { height: 0.1, top: 5, sides: 16 },
    C.water,
    { parent: n, position: [0, 0.68, 0] },
    { glow: 0.35 },
  );
  kit.cylinder({ height: 1.6, top: 0.7, bottom: 1, sides: 8 }, C.stone, { parent: n, position: [0, 1.4, 0] });
  kit.cylinder({ height: 0.35, top: 2.6, bottom: 1.6, sides: 12 }, C.stone, {
    parent: n,
    position: [0, 2.3, 0],
  });
  kit.cylinder(
    { height: 0.08, top: 2.3, sides: 12 },
    C.water,
    { parent: n, position: [0, 2.48, 0] },
    { glow: 0.4 },
  );
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    kit.box(
      [0.12, 1.5, 0.12],
      C.foam,
      {
        parent: n,
        position: [Math.sin(a) * 1.25, 1.75, Math.cos(a) * 1.25],
        rotation: [Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35],
      },
      { glow: 0.5 },
    );
  }
  kit.cylinder({ height: 0.5, top: 0.7, bottom: 0.9, sides: 8 }, C.stone, {
    parent: n,
    position: [0, 2.75, 0],
  });
  // Tượng: người cầm cờ.
  kit.cylinder({ height: 1.1, top: 0.45, bottom: 0.7, sides: 8 }, C.gold, {
    parent: n,
    position: [0, 3.55, 0],
  });
  kit.ball(0.32, C.gold, { parent: n, position: [0, 4.35, 0] }, 1);
  kit.cylinder({ height: 1.6, top: 0.06, sides: 5 }, C.gold, {
    parent: n,
    position: [0.45, 4.4, 0],
    rotation: [0, 0, -0.15],
  });
  kit.box([0.7, 0.45, 0.04], C.gold, { parent: n, position: [0.85, 5, 0] });
  // Ghế đá, bồn hoa, đèn có cờ.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    bench(kit, n.position.x + Math.sin(a) * 6.2, n.position.z + Math.cos(a) * 6.2, a + Math.PI);
  }
  for (const a of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) {
    const x = n.position.x + Math.sin(a) * 8.4;
    const z = n.position.z + Math.cos(a) * 8.4;
    lamp(kit, x, z);
  }
  for (const a of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
    const x = Math.sin(a + 0.4) * 8.2;
    const z = Math.cos(a + 0.4) * 8.2;
    kit.cylinder({ height: 0.5, top: 1.4, sides: 10 }, C.stoneDark, { parent: n, position: [x, 0.25, z] });
    ["#f26d8f", "#ffd34d", "#ff8a3d", "#c86bfa"].forEach((color, i) =>
      kit.ball(
        0.2,
        color,
        { parent: n, position: [x + Math.sin(i * 1.6) * 0.4, 0.6, z + Math.cos(i * 1.6) * 0.4] },
        0,
      ),
    );
  }
}

function buildSchool(kit: LowPolyKit, n: TransformNode) {
  const front = -3.5;
  kit.box([10, 4.2, 7], C.brick, { parent: n, position: [0, 2.1, 0] });
  kit.box([10.2, 0.25, 7.2], C.white, { parent: n, position: [0, 2.1, 0] });
  kit.box([10.4, 0.3, 7.4], C.white, { parent: n, position: [0, 4.2, 0] });
  kit.roof({ length: 10.6, width: 7.6, height: 2.4 }, C.roofBlue, { parent: n, position: [0, 4.3, 0] });
  // Tháp đồng hồ ở giữa, nhô ra trước.
  kit.box([2.8, 7.4, 2.4], C.cream, { parent: n, position: [0, 3.7, front - 0.6] });
  kit.box([3, 0.3, 2.6], C.white, { parent: n, position: [0, 7.45, front - 0.6] });
  kit.cylinder(
    { height: 0.12, top: 1.7, sides: 16 },
    C.white,
    { parent: n, position: [0, 6.2, front - 1.84], rotation: [Math.PI / 2, 0, 0] },
    { glow: 0.4 },
  );
  kit.box([0.1, 0.6, 0.05], C.black, { parent: n, position: [0, 6.4, front - 1.92] });
  kit.box([0.45, 0.09, 0.05], C.black, { parent: n, position: [0.18, 6.2, front - 1.92] });
  kit.cone({ height: 3, diameter: 3.6, sides: 4 }, C.roofBlue, {
    parent: n,
    position: [0, 9.1, front - 0.6],
    rotation: [0, Math.PI / 4, 0],
  });
  kit.ball(0.2, C.gold, { parent: n, position: [0, 10.7, front - 0.6] }, 1);
  kit.cylinder({ height: 1.4, top: 0.05, sides: 5 }, C.gold, { parent: n, position: [0, 11.4, front - 0.6] });
  kit.box([0.8, 0.5, 0.04], "#ff9a2e", { parent: n, position: [0.42, 11.85, front - 0.6] });
  door(kit, n, 0, front - 1.8, C.navy, 1.4, 2.2);
  kit.box([3.4, 0.25, 1], C.stoneDark, { parent: n, position: [0, 0.12, front - 2.3] });
  for (const x of [-4, -2.6, 2.6, 4]) {
    window_(kit, n, x, 1.2, front);
    window_(kit, n, x, 3.1, front, 0.8, 0.9);
  }
  // Sân chơi bên phải: cầu trượt, xích đu, bể bơi bé tí.
  const px = 8.5;
  kit.box([1, 2, 1], C.red, { parent: n, position: [px, 1, -1.5] });
  kit.box([0.9, 0.12, 3], "#ffcf3d", { parent: n, position: [px, 1.05, -3.3], rotation: [-0.6, 0, 0] });
  for (const dz of [1, 3]) {
    kit.box([0.12, 2.4, 0.12], "#2f6db3", { parent: n, position: [px - 1.3, 1.2, dz] });
    kit.box([0.12, 2.4, 0.12], "#2f6db3", { parent: n, position: [px + 1.3, 1.2, dz] });
  }
  kit.box([2.8, 0.12, 0.12], "#2f6db3", { parent: n, position: [px, 2.4, 1] });
  kit.box([2.8, 0.12, 0.12], "#2f6db3", { parent: n, position: [px, 2.4, 3] });
  kit.cylinder({ height: 0.3, top: 2.6, sides: 12 }, C.white, { parent: n, position: [px, 0.15, -6] });
  kit.cylinder(
    { height: 0.1, top: 2.3, sides: 12 },
    C.water,
    { parent: n, position: [px, 0.3, -6] },
    { glow: 0.35 },
  );
  fence(kit, n, px - 2.2, -7.6, px + 2.2, -7.6);
}

function buildLibrary(kit: LowPolyKit, n: TransformNode) {
  kit.box([12, 0.5, 8], C.stoneDark, { parent: n, position: [0, 0.25, 0] });
  kit.box([11, 4.4, 7], C.cream, { parent: n, position: [0, 2.7, 0.2] });
  kit.box([11.3, 0.35, 7.3], C.white, { parent: n, position: [0, 4.95, 0.2] });
  kit.roof({ length: 11.6, width: 7.6, height: 2.6 }, C.roofBlue, { parent: n, position: [0, 5.1, 0.2] });
  // Sảnh chính nhô ra, đầu hồi có quyển sách vàng mở.
  kit.box([5, 4.8, 1.8], C.cream, { parent: n, position: [0, 2.9, -4] });
  kit.roof({ length: 2.2, width: 5.6, height: 2.2 }, C.roofBlue, {
    parent: n,
    position: [0, 5.3, -4],
    rotation: [0, Math.PI / 2, 0],
  });
  kit.box(
    [2.4, 1.5, 0.12],
    C.gold,
    { parent: n, position: [-0.62, 6.2, -5.12], rotation: [0, -0.3, 0] },
    { glow: 0.3 },
  );
  kit.box(
    [2.4, 1.5, 0.12],
    C.gold,
    { parent: n, position: [0.62, 6.2, -5.12], rotation: [0, 0.3, 0] },
    { glow: 0.3 },
  );
  kit.box([1, 1.2, 0.1], C.white, { parent: n, position: [-0.55, 6.2, -5.22], rotation: [0, -0.3, 0] });
  kit.box([1, 1.2, 0.1], C.white, { parent: n, position: [0.55, 6.2, -5.22], rotation: [0, 0.3, 0] });
  for (const x of [-2, -0.8, 0.8, 2])
    kit.cylinder({ height: 3.4, top: 0.36, bottom: 0.42, sides: 8 }, C.white, {
      parent: n,
      position: [x, 2.2, -5.2],
    });
  door(kit, n, 0, -4.9, C.wood, 1.3, 2.3);
  kit.box([6, 0.3, 1.3], C.stoneDark, { parent: n, position: [0, 0.15, -6.2] });
  for (const x of [-4.2, -3, 3, 4.2]) {
    window_(kit, n, x, 1.6, -3.3, 0.7, 1.2);
    window_(kit, n, x, 3.7, -3.3, 0.7, 0.8);
  }
  for (const x of [-6.6, 6.6]) {
    kit.cylinder({ height: 4.2, top: 0.07, sides: 5 }, C.black, { parent: n, position: [x, 2.1, -3.5] });
    kit.box([0.05, 1.6, 0.9], C.roofBlue, { parent: n, position: [x, 3.3, -3.05] });
    kit.box([0.06, 0.2, 0.9], C.gold, { parent: n, position: [x, 3.9, -3.05] });
  }
  for (const x of [-5, 5]) bush(kit, n.position.x + x, n.position.z - 4.6, 1, "#f26d8f");
}

function buildMarket(kit: LowPolyKit, n: TransformNode) {
  kit.box([17, 0.1, 13], C.pathEdge, { parent: n, position: [0, 0.05, 0] });
  kit.box([16.4, 0.12, 12.4], C.plaza, { parent: n, position: [0, 0.06, 0] });
  const stalls: { x: number; z: number; colors: [string, string]; produce: string[] }[] = [
    { x: -5, z: -2.5, colors: [C.red, C.white], produce: ["#e0413c", "#ff9a2e", "#e0413c"] },
    { x: 0.5, z: -3, colors: ["#2f6db3", C.white], produce: ["#6ab04c", "#a6d84a", "#ffd34d"] },
    { x: 5.8, z: -2.2, colors: ["#3f9a52", C.white], produce: ["#b04ad0", "#ff9a2e", "#6ab04c"] },
    { x: -2.6, z: 3.2, colors: ["#ffbf1f", C.white], produce: ["#ffd34d", "#e0413c", "#a6d84a"] },
    { x: 3.6, z: 3.4, colors: [C.red, "#ffd34d"], produce: ["#ff9a2e", "#6ab04c", "#e0413c"] },
  ];
  for (const stall of stalls) {
    kit.box([3, 1, 1.3], C.wood, { parent: n, position: [stall.x, 0.5, stall.z] });
    kit.box([3.1, 0.1, 1.4], C.woodLight, { parent: n, position: [stall.x, 1.04, stall.z] });
    for (const [dx, dz] of [
      [-1.4, -0.65],
      [1.4, -0.65],
      [-1.4, 1.4],
      [1.4, 1.4],
    ])
      kit.cylinder({ height: 2.6, top: 0.11, sides: 5 }, C.woodLight, {
        parent: n,
        position: [stall.x + dx, 1.3, stall.z + dz],
      });
    awning(kit, n, stall.x, 2.6, stall.z + 0.3, 3.2, stall.colors, 2.4);
    stall.produce.forEach((color, i) => {
      const px = stall.x - 1 + i;
      kit.box([0.75, 0.22, 0.6], C.woodLight, { parent: n, position: [px, 1.18, stall.z] });
      for (const [ox, oz] of [
        [-0.15, -0.12],
        [0.15, -0.12],
        [0, 0.12],
        [0.05, -0.02],
      ])
        kit.ball(0.14, color, { parent: n, position: [px + ox, 1.38, stall.z + oz] }, 0);
    });
  }
  // Thùng gỗ, thùng tô-nô, giỏ.
  for (const [x, z] of [
    [-7.5, 0.5],
    [7.6, 1],
    [-7.2, 4.8],
  ]) {
    kit.box([0.8, 0.7, 0.8], C.woodLight, { parent: n, position: [x, 0.35, z] });
    kit.box([0.7, 0.6, 0.7], C.wood, { parent: n, position: [x + 0.2, 1, z] });
  }
  for (const [x, z] of [
    [7.4, -4.6],
    [-7.6, -4.8],
  ])
    kit.cylinder({ height: 1, top: 0.6, bottom: 0.72, sides: 8 }, C.wood, {
      parent: n,
      position: [x, 0.5, z],
    });
}

function buildCafe(kit: LowPolyKit, n: TransformNode) {
  const front = -3;
  kit.box([7.4, 3.6, 6], C.cream, { parent: n, position: [0, 1.8, 0] });
  for (const x of [-3.65, -1.2, 1.2, 3.65])
    kit.box([0.18, 3.6, 0.06], "#7a4a2a", { parent: n, position: [x, 1.8, front - 0.03] });
  kit.roof({ length: 8, width: 6.8, height: 2.6 }, C.roofRed, { parent: n, position: [0, 3.6, 0] });
  kit.box([0.6, 1.6, 0.6], C.brick, { parent: n, position: [-2.4, 5.4, 1] });
  // Tách cà phê khổng lồ trên mái.
  kit.cylinder({ height: 0.15, top: 2.6, sides: 16 }, C.white, { parent: n, position: [1.4, 5.65, 0] });
  kit.cylinder({ height: 1.7, top: 1.9, bottom: 1.4, sides: 16 }, C.white, {
    parent: n,
    position: [1.4, 6.55, 0],
  });
  kit.cylinder({ height: 0.08, top: 1.7, sides: 16 }, "#6b3a1f", { parent: n, position: [1.4, 7.38, 0] });
  const handle = MeshBuilder.CreateTorus(
    "cup-handle",
    { diameter: 0.9, thickness: 0.18, tessellation: 12 },
    kit.scene,
  );
  kit.adopt(handle, C.white, {
    parent: n,
    position: [2.45, 6.6, 0],
    rotation: [Math.PI / 2, 0, Math.PI / 2],
  });
  for (const [dx, dy] of [
    [-0.2, 0],
    [0.15, 0.45],
    [-0.1, 0.9],
  ])
    kit.ball(0.22, C.white, { parent: n, position: [1.4 + dx, 7.8 + dy, 0] }, 1, { glow: 0.3 });
  // Mặt tiền: cửa, 2 cửa sổ lớn, mái hiên sọc vàng đỏ.
  door(kit, n, 0, front, C.green, 1.1, 2.1);
  for (const x of [-2.4, 2.4]) window_(kit, n, x, 1.5, front, 1.4, 1.3);
  awning(kit, n, -2.4, 2.75, front - 0.6, 2.2, ["#ffbf1f", C.red]);
  awning(kit, n, 2.4, 2.75, front - 0.6, 2.2, ["#ffbf1f", C.red]);
  // Sân hiên gỗ phía trước + bàn ô.
  kit.box([9, 0.15, 4.2], C.woodLight, { parent: n, position: [0, 0.07, front - 2.3] });
  for (const x of [-3, 3]) umbrellaTable(kit, n, x, front - 2.4);
  fence(kit, n, -4.5, front - 4.4, -1.4, front - 4.4);
  fence(kit, n, 1.4, front - 4.4, 4.5, front - 4.4);
  for (const x of [-4.2, 4.2]) bush(kit, n.position.x + x, n.position.z + 2, 1, "#ffd34d");
}

function buildTheater(kit: LowPolyKit, n: TransformNode) {
  const front = -3.5;
  kit.box([10, 5.6, 7], C.brick, { parent: n, position: [0, 2.8, 0] });
  kit.box([10.4, 0.4, 7.4], C.gold, { parent: n, position: [0, 5.7, 0] });
  kit.box([10, 0.2, 7], C.brickDark, { parent: n, position: [0, 5.95, 0] });
  // Mặt tiền: khung kem, bảng hiệu vàng có bóng đèn, mái che, áp phích.
  kit.box([10.2, 1.2, 0.3], C.cream, { parent: n, position: [0, 0.6, front - 0.1] });
  kit.box([6.4, 2, 0.4], C.gold, { parent: n, position: [0, 4.4, front - 0.25] });
  kit.box([5.8, 1.4, 0.42], C.red, { parent: n, position: [0, 4.4, front - 0.28] });
  for (let i = 0; i < 6; i++)
    kit.box(
      [0.5, 0.7, 0.06],
      C.white,
      { parent: n, position: [-2 + i * 0.8, 4.4, front - 0.52] },
      { glow: 0.6 },
    );
  for (let i = 0; i < 12; i++) {
    const x = -3 + i * (6 / 11);
    kit.ball(0.09, "#fff2a0", { parent: n, position: [x, 5.42, front - 0.48] }, 0, { glow: 1 });
    kit.ball(0.09, "#fff2a0", { parent: n, position: [x, 3.38, front - 0.48] }, 0, { glow: 1 });
  }
  kit.box([7.2, 0.35, 2], C.red, { parent: n, position: [0, 3, front - 1] });
  kit.box([7.3, 0.12, 2.1], C.gold, { parent: n, position: [0, 2.8, front - 1] });
  kit.box([3.4, 2.4, 0.1], C.gold, { parent: n, position: [0, 1.2, front - 0.04] });
  kit.box([3, 2.2, 0.1], "#2b2350", { parent: n, position: [0, 1.1, front - 0.08] }, { glow: 0.25 });
  for (const [x, color] of [
    [-3.6, "#ff9a2e"],
    [3.6, "#4fb3d9"],
  ] as const) {
    kit.box([1.3, 1.8, 0.08], C.gold, { parent: n, position: [x, 1.9, front - 0.04] });
    kit.box([1.1, 1.6, 0.08], color, { parent: n, position: [x, 1.9, front - 0.08] }, { glow: 0.3 });
  }
  // Xô bắp rang khổng lồ trên mái.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    kit.box([0.62, 2.2, 0.1], i % 2 ? C.white : C.red, {
      parent: n,
      position: [3 + Math.sin(a) * 0.82, 7.15, 1 + Math.cos(a) * 0.82],
      rotation: [0, a, 0],
    });
  }
  kit.cylinder({ height: 2.2, top: 1.6, bottom: 1.2, sides: 8 }, C.white, {
    parent: n,
    position: [3, 7.15, 1],
  });
  for (let i = 0; i < 9; i++)
    kit.ball(
      0.32,
      i % 3 ? "#fff6d0" : "#ffd34d",
      {
        parent: n,
        position: [3 + Math.sin(i * 2.1) * 0.5, 8.4 + (i % 3) * 0.18, 1 + Math.cos(i * 2.1) * 0.5],
      },
      1,
    );
  // Thảm đỏ + cột dây chắn.
  kit.box([2.2, 0.04, 3], C.red, { parent: n, position: [0, 0.03, front - 1.6] });
  for (const x of [-1.5, 1.5])
    for (const dz of [-0.8, -2.8]) {
      kit.cylinder({ height: 0.9, top: 0.1, sides: 6 }, C.gold, {
        parent: n,
        position: [x, 0.45, front + dz],
      });
      kit.ball(0.1, C.gold, { parent: n, position: [x, 0.95, front + dz] }, 0);
    }
  for (const x of [-1.5, 1.5])
    kit.box([0.06, 0.06, 2], C.red, { parent: n, position: [x, 0.75, front - 1.8] });
}

function buildPostOffice(kit: LowPolyKit, n: TransformNode) {
  const front = -3;
  kit.box([8, 3.8, 6], C.cream, { parent: n, position: [0, 1.9, 0] });
  kit.box([8.2, 0.6, 6.2], C.red, { parent: n, position: [0, 0.3, 0] });
  // Mái đỏ, đầu hồi nhìn ra trước, có phong bì trắng.
  kit.roof({ length: 6.6, width: 8.8, height: 3 }, C.roofRed, {
    parent: n,
    position: [0, 3.8, 0],
    rotation: [0, Math.PI / 2, 0],
  });
  kit.box([2.4, 1.5, 0.15], C.white, { parent: n, position: [0, 4.75, front - 0.45] }, { glow: 0.2 });
  kit.box([1.45, 0.12, 0.16], C.red, {
    parent: n,
    position: [-0.55, 5.05, front - 0.55],
    rotation: [0, 0, -0.6],
  });
  kit.box([1.45, 0.12, 0.16], C.red, {
    parent: n,
    position: [0.55, 5.05, front - 0.55],
    rotation: [0, 0, 0.6],
  });
  kit.box([0.6, 1.6, 0.6], C.brick, { parent: n, position: [2.6, 5.2, 1.4] });
  door(kit, n, 0, front, "#2f6db3", 1.2, 2.2);
  for (const x of [-2.6, 2.6]) window_(kit, n, x, 1.9, front, 1.1, 1.3);
  kit.box([4.2, 0.3, 1.2], C.stoneDark, { parent: n, position: [0, 0.15, front - 0.6] });
  // Hộp thư đỏ đầu tròn, thùng hàng.
  for (const x of [-3.2, 3.4]) {
    kit.cylinder({ height: 1.3, top: 0.6, sides: 10 }, C.red, {
      parent: n,
      position: [x, 0.65, front - 1.6],
    });
    kit.ball(0.3, C.red, { parent: n, position: [x, 1.3, front - 1.6], scaling: [1, 0.6, 1] }, 1);
    kit.box([0.32, 0.06, 0.06], C.black, { parent: n, position: [x, 1.05, front - 1.92] });
  }
  for (const [x, z, s] of [
    [4.6, -1, 0.7],
    [4.9, 0.1, 0.55],
    [4.5, 0.2, 0.45],
  ] as const)
    kit.box([s, s, s], "#c9935a", { parent: n, position: [x, s / 2 + (z > 0 && s < 0.5 ? 0.55 : 0), z] });
}

function buildBusStation(kit: LowPolyKit, n: TransformNode) {
  const front = -3.5;
  kit.box([11, 4.2, 7], "#e7e0cf", { parent: n, position: [0, 2.1, 0] });
  kit.box([11.2, 0.3, 7.2], C.white, { parent: n, position: [0, 4.2, 0] });
  kit.roof({ length: 11.6, width: 7.6, height: 2.2 }, C.roofBlue, { parent: n, position: [0, 4.3, 0] });
  kit.box([1.6, 1.4, 1.6], C.cream, { parent: n, position: [-3, 6.8, 0] });
  kit.cone({ height: 1.3, diameter: 2.2, sides: 4 }, C.roofBlue, {
    parent: n,
    position: [-3, 8.15, 0],
    rotation: [0, Math.PI / 4, 0],
  });
  kit.cylinder(
    { height: 0.1, top: 1, sides: 14 },
    C.white,
    { parent: n, position: [-3, 6.8, -0.82], rotation: [Math.PI / 2, 0, 0] },
    { glow: 0.4 },
  );
  // 2 cửa gara lớn + biển cờ lê.
  for (const x of [-2.8, 1.6]) {
    kit.box([3.2, 3, 0.12], C.white, { parent: n, position: [x, 1.5, front - 0.03] });
    kit.box([2.9, 2.8, 0.12], "#3d4655", { parent: n, position: [x, 1.4, front - 0.07] });
    for (let i = 0; i < 6; i++)
      kit.box([2.9, 0.06, 0.13], "#56606f", { parent: n, position: [x, 0.3 + i * 0.45, front - 0.08] });
  }
  kit.cylinder({ height: 0.2, top: 1.5, sides: 12 }, C.gold, {
    parent: n,
    position: [4.5, 3.2, front - 0.1],
    rotation: [Math.PI / 2, 0, 0],
  });
  kit.box([0.25, 1.2, 0.1], "#5b6475", {
    parent: n,
    position: [4.5, 3.2, front - 0.25],
    rotation: [0, 0, 0.7],
  });
  kit.box([0.6, 0.3, 0.1], "#5b6475", {
    parent: n,
    position: [4.85, 3.6, front - 0.25],
    rotation: [0, 0, 0.7],
  });
  door(kit, n, 4.5, front, C.navy, 1, 2);
  // Xe buýt vàng đỗ trước bến.
  const bz = -7.6;
  kit.box([6.4, 2, 2.3], "#f5c232", { parent: n, position: [-1.4, 1.35, bz] });
  kit.box([6.45, 0.7, 2.35], "#1f2a36", { parent: n, position: [-1.4, 1.75, bz] }, { glow: 0.25 });
  kit.box([6.5, 0.14, 2.4], C.black, { parent: n, position: [-1.4, 0.65, bz] });
  kit.box([6.4, 0.25, 2.3], "#e0a91d", { parent: n, position: [-1.4, 2.4, bz] });
  kit.box([0.1, 0.5, 2.1], "#fff2a0", { parent: n, position: [-4.65, 1, bz] }, { glow: 0.8 });
  for (const dx of [-3.4, 0.6])
    for (const dz of [-1.1, 1.1])
      kit.cylinder({ height: 0.34, top: 0.95, sides: 10 }, C.black, {
        parent: n,
        position: [-1.4 + dx + 1.4, 0.48, bz + dz],
        rotation: [Math.PI / 2, 0, 0],
      });
  // Nhà chờ mái xanh + biển dừng.
  kit.box([2.8, 0.15, 1.6], C.roofBlue, { parent: n, position: [4.6, 2.5, bz + 0.6] });
  for (const x of [3.4, 5.8])
    kit.box([0.12, 2.4, 0.12], C.black, { parent: n, position: [x, 1.2, bz + 1.2] });
  kit.box(
    [2.6, 1.6, 0.06],
    C.glass,
    { parent: n, position: [4.6, 1.4, bz + 1.3] },
    { alpha: 0.45, glow: 0.3 },
  );
  kit.box([2.2, 0.1, 0.5], C.woodLight, { parent: n, position: [4.6, 0.5, bz + 1] });
  // Lốp xe, thùng phuy xanh.
  for (let i = 0; i < 3; i++)
    kit.cylinder({ height: 0.3, top: 0.85, sides: 10 }, C.black, {
      parent: n,
      position: [6.4, 0.16 + i * 0.31, -1.6],
    });
  for (const z of [-0.2, 0.9])
    kit.cylinder({ height: 1.1, top: 0.7, sides: 10 }, "#2f6db3", { parent: n, position: [6.5, 0.55, z] });
}

function buildFarm(kit: LowPolyKit, n: TransformNode) {
  // Chuồng đỏ, đầu hồi nhìn ra trước, viền trắng, cửa chữ X.
  const bx = -4;
  const bz = 2.5;
  kit.box([6, 4.2, 5], "#c23a2e", { parent: n, position: [bx, 2.1, bz] });
  kit.roof({ length: 5.4, width: 6.6, height: 2.6 }, "#8e2a22", {
    parent: n,
    position: [bx, 4.2, bz],
    rotation: [0, Math.PI / 2, 0],
  });
  kit.box([6.1, 0.16, 0.1], C.white, { parent: n, position: [bx, 4.2, bz - 2.55] });
  for (const x of [-3, 3])
    kit.box([0.16, 4.2, 0.1], C.white, { parent: n, position: [bx + x, 2.1, bz - 2.55] });
  kit.box([2.6, 2.6, 0.12], "#a32c23", { parent: n, position: [bx, 1.3, bz - 2.56] });
  kit.box([2.8, 0.14, 0.14], C.white, { parent: n, position: [bx, 2.6, bz - 2.62] });
  for (const r of [0.75, -0.75])
    kit.box([3.5, 0.14, 0.14], C.white, { parent: n, position: [bx, 1.3, bz - 2.62], rotation: [0, 0, r] });
  kit.box([1.1, 0.9, 0.12], C.white, { parent: n, position: [bx, 3.5, bz - 2.56] });
  kit.box([0.85, 0.65, 0.13], "#e8c55a", { parent: n, position: [bx, 3.5, bz - 2.6] });
  kit.cylinder({ height: 5.4, top: 1.8, sides: 12 }, "#d9d2c3", {
    parent: n,
    position: [bx + 4.4, 2.7, bz + 1],
  });
  kit.ball(0.92, "#9aa3ad", { parent: n, position: [bx + 4.4, 5.4, bz + 1], scaling: [1, 0.6, 1] });
  // Đụn rơm.
  for (const [x, z] of [
    [bx + 4.2, bz - 2.2],
    [bx + 5.3, bz - 1.6],
  ])
    kit.cylinder({ height: 1.2, top: 1, sides: 10 }, "#efcf5f", {
      parent: n,
      position: [x, 0.5, z],
      rotation: [0, 0, Math.PI / 2],
    });
  // Ruộng hoa hướng dương.
  const sx = 5;
  const sz = -3.5;
  kit.box([6.5, 0.12, 5], "#7a5232", { parent: n, position: [sx, 0.06, sz] });
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 5; c++) {
      const x = sx - 2.6 + c * 1.3;
      const z = sz - 1.8 + r * 1.2;
      kit.cylinder({ height: 1.5, top: 0.07, sides: 4 }, C.green, { parent: n, position: [x, 0.75, z] });
      kit.box([0.35, 0.12, 0.25], C.leaf, {
        parent: n,
        position: [x + 0.18, 0.7, z],
        rotation: [0, 0, -0.5],
      });
      kit.cylinder({ height: 0.1, top: 0.62, sides: 10 }, "#ffc81f", {
        parent: n,
        position: [x, 1.6, z - 0.08],
        rotation: [-Math.PI / 2 + 0.3, 0, 0],
      });
      kit.cylinder({ height: 0.12, top: 0.28, sides: 8 }, "#6b3d1f", {
        parent: n,
        position: [x, 1.61, z - 0.13],
        rotation: [-Math.PI / 2 + 0.3, 0, 0],
      });
    }
  // Ruộng rau.
  const vx = -4;
  const vz = -6.5;
  kit.box([7, 0.12, 4], "#7a5232", { parent: n, position: [vx, 0.06, vz] });
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 6; c++)
      kit.ball(
        0.3,
        r % 2 ? "#8bd04f" : "#5fb33f",
        { parent: n, position: [vx - 2.9 + c * 1.15, 0.32, vz - 1.2 + r * 1.2] },
        0,
      );
  fence(kit, n, vx - 3.8, vz - 2.3, vx + 3.8, vz - 2.3);
  fence(kit, n, sx - 3.5, sz - 2.8, sx + 3.5, sz - 2.8);
  // Hai chú bò sữa.
  for (const [x, z, a] of [
    [1, -0.5, 0.3],
    [-0.5, -2.8, -0.6],
  ]) {
    const cow = new TransformNode("cow", kit.scene);
    cow.parent = n;
    cow.position.set(x, 0, z);
    cow.rotation.y = a;
    kit.box([1.5, 0.85, 0.8], C.white, { parent: cow, position: [0, 0.95, 0] });
    kit.box([0.5, 0.5, 0.82], C.black, { parent: cow, position: [-0.3, 1.05, 0] });
    kit.box([0.3, 0.35, 0.82], C.black, { parent: cow, position: [0.45, 0.9, 0.05] });
    kit.box([0.5, 0.5, 0.55], C.white, { parent: cow, position: [0.95, 1.25, 0] });
    kit.box([0.2, 0.25, 0.45], "#f2a3a3", { parent: cow, position: [1.22, 1.12, 0] });
    for (const [lx, lz] of [
      [-0.55, -0.28],
      [0.55, -0.28],
      [-0.55, 0.28],
      [0.55, 0.28],
    ])
      kit.box([0.16, 0.55, 0.16], C.white, { parent: cow, position: [lx, 0.27, lz] });
  }
}

/** Cối xay gió (cánh quạt dựng riêng ở nhóm "windmill-sails" để quay). Trả về tâm trục quạt. */
function buildWindmill(kit: LowPolyKit, x: number, z: number): Vector3 {
  kit.useGroup("farm-extra");
  blockers.push(rect(x, z, 3, 3));
  kit.cylinder({ height: 6.5, top: 1.6, bottom: 2.6, sides: 8 }, "#b9824a", { position: [x, 3.25, z] });
  for (let i = 0; i < 4; i++)
    kit.cylinder({ height: 0.12, top: 2.6 - i * 0.28, sides: 8 }, C.wood, { position: [x, 1 + i * 1.5, z] });
  kit.box([0.9, 1.5, 0.1], C.wood, { position: [x, 0.75, z - 1.25] });
  kit.cone({ height: 1.8, diameter: 2.4, sides: 8 }, C.roofRed, { position: [x, 7.4, z] });
  const hub = new Vector3(x, 6.4, z - 1.25);
  kit.useGroup("windmill-sails");
  kit.cylinder({ height: 0.5, top: 0.45, sides: 8 }, C.wood, {
    position: [hub.x, hub.y, hub.z],
    rotation: [Math.PI / 2, 0, 0],
  });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const node = new TransformNode("sail", kit.scene);
    node.position.copyFrom(hub);
    node.rotation.z = a;
    kit.box([0.18, 4, 0.1], C.wood, { parent: node, position: [0, 2.1, -0.08] });
    kit.box([1, 3.2, 0.06], C.white, { parent: node, position: [0.55, 2.3, -0.12] });
    for (let k = 0; k < 4; k++)
      kit.box([1.05, 0.07, 0.08], C.wood, { parent: node, position: [0.55, 1 + k * 0.8, -0.14] });
  }
  return hub;
}

function buildCastle(kit: LowPolyKit) {
  kit.useGroup("castle");
  const cx = 33;
  const cz = 42;
  // Cao nguyên đá (vách đá nhiều tầng).
  blockers.push(rect(cx, cz + 0.5, 30, 13));
  kit.box([30, 3.2, 13], C.rock, { position: [cx, 1.6, cz + 0.5] });
  kit.box([29, 0.4, 12.2], C.grassDark, { position: [cx, 3.3, cz + 0.5] });
  for (let i = 0; i < 9; i++)
    kit.box([3.4, 3.4, 1], i % 2 ? C.rockDark : C.rock, {
      position: [cx - 14 + i * 3.5, 1.5, cz - 6.2],
      rotation: [0, 0, (i % 3) * 0.05],
    });
  // Bậc thang đá lên cổng.
  for (let i = 0; i < 6; i++)
    kit.box([4, 0.55, 0.9], C.stone, { position: [cx - 3, 0.28 + i * 0.55, cz - 7.6 + i * 0.75] });
  // Tường thành + tháp tròn mái xanh.
  const base = 3.5;
  kit.box([22, 3.6, 1.2], C.castle, { position: [cx, base + 1.8, cz - 3.5] });
  for (let i = 0; i < 11; i++)
    kit.box([0.9, 0.7, 1.3], C.castle, { position: [cx - 10 + i * 2, base + 3.9, cz - 3.5] });
  kit.box([3.4, 3.2, 0.2], "#5a3a22", { position: [cx - 3, base + 1.6, cz - 4.15] });
  kit.cylinder({ height: 0.2, top: 3.4, sides: 12 }, "#5a3a22", {
    position: [cx - 3, base + 3.2, cz - 4.15],
    rotation: [Math.PI / 2, 0, 0],
  });
  const tower = (x: number, z: number, h: number, d: number) => {
    kit.cylinder({ height: h, top: d, sides: 10 }, C.castle, { position: [x, base + h / 2, z] });
    kit.cylinder({ height: 0.5, top: d + 0.4, sides: 10 }, "#c9c2b4", { position: [x, base + h, z] });
    kit.cone({ height: d * 1.4, diameter: d + 0.8, sides: 10 }, C.roofBlue, {
      position: [x, base + h + 0.25 + d * 0.7, z],
    });
    kit.cylinder({ height: 1.2, top: 0.06, sides: 5 }, C.gold, {
      position: [x, base + h + d * 1.4 + 0.8, z],
    });
    kit.box([0.7, 0.4, 0.04], C.gold, { position: [x + 0.37, base + h + d * 1.4 + 1.2, z] });
    for (const dy of [h * 0.45, h * 0.75])
      kit.box([0.4, 0.7, 0.1], "#3a3f5a", { position: [x, base + dy, z - d / 2 - 0.02] }, { glow: 0.3 });
  };
  tower(cx - 11, cz - 3.5, 6, 2.4);
  tower(cx + 11, cz - 3.5, 6, 2.4);
  tower(cx - 6, cz - 3.5, 5, 1.8);
  tower(cx + 1, cz - 3.5, 5, 1.8);
  // Lâu chính phía sau.
  kit.box([12, 7, 6], C.castle, { position: [cx, base + 3.5, cz + 2] });
  kit.roof({ length: 12.4, width: 6.4, height: 3 }, C.roofBlue, { position: [cx, base + 7, cz + 2] });
  for (const x of [-4, -1.3, 1.3, 4])
    kit.box([0.6, 1.2, 0.1], "#3a3f5a", { position: [cx + x, base + 4.5, cz - 1.02] }, { glow: 0.3 });
  tower(cx - 6.5, cz + 2, 10, 2.6);
  tower(cx + 6.5, cz + 2, 10, 2.6);
  tower(cx, cz + 3, 12, 3);
  // Cờ đuôi nheo xanh trên tường.
  for (const x of [-8, -4, 2, 6])
    kit.box([1, 2.2, 0.06], C.roofBlue, { position: [cx + x, base + 2.4, cz - 4.15] });
}

// -----------------------------------------------------------------------------
// Bố cục
// -----------------------------------------------------------------------------

interface PlaceLayout {
  key: TownPlaceKey;
  center: Point;
  /** Kích thước vùng bấm chọn (rộng, cao, sâu). */
  hit: [number, number, number];
  signY: number;
  /** Lệch vị trí biển tên so với tâm (x, z). */
  signOffset?: Point;
  spot: Point;
  /** Vật cản, tính từ tâm địa điểm. */
  blockers: Rect[];
  build: (kit: LowPolyKit, node: TransformNode) => void;
}

const LAYOUT: PlaceLayout[] = [
  {
    key: "square",
    center: { x: 0, z: 2 },
    hit: [7, 6, 7],
    signY: 6.6,
    signOffset: { x: 0, z: -3.2 },
    spot: { x: 0, z: -2.4 },
    blockers: [rect(0, 0, 5.6, 5.6)],
    build: buildSquare,
  },
  {
    key: "school",
    center: { x: -30, z: 28 },
    hit: [10.4, 8, 9],
    signY: 13,
    spot: { x: -30, z: 21.4 },
    blockers: [
      rect(0, 0, 10.2, 7.2),
      rect(0, -4.1, 3, 2.4),
      rect(8.5, -1.5, 1.2, 1.2),
      rect(8.5, 2, 3, 2.4),
      rect(8.5, -6, 2.6, 2.6),
    ],
    build: buildSchool,
  },
  {
    key: "library",
    center: { x: -4, z: 27 },
    hit: [12, 7, 10],
    signY: 9.4,
    spot: { x: -4, z: 19.8 },
    blockers: [
      rect(0, 0.2, 11.2, 7.2),
      rect(0, -4.3, 5.2, 2.2),
      rect(-6.6, -3.5, 0.3, 0.3),
      rect(6.6, -3.5, 0.3, 0.3),
    ],
    build: buildLibrary,
  },
  {
    key: "market",
    center: { x: 19, z: 23 },
    hit: [16, 4, 12],
    signY: 6,
    spot: { x: 19.5, z: 15.8 },
    blockers: [
      rect(-5, -2.5, 3, 1.3),
      rect(0.5, -3, 3, 1.3),
      rect(5.8, -2.2, 3, 1.3),
      rect(-2.6, 3.2, 3, 1.3),
      rect(3.6, 3.4, 3, 1.3),
      rect(-7.4, 0.6, 1, 1),
      rect(7.7, 1, 1, 1),
      rect(-7.1, 4.8, 1, 1),
      rect(7.4, -4.6, 0.8, 0.8),
      rect(-7.6, -4.8, 0.8, 0.8),
    ],
    build: buildMarket,
  },
  {
    key: "cafe",
    center: { x: -24, z: 5 },
    hit: [9, 6, 10],
    signY: 9.4,
    spot: { x: -24, z: -2.6 },
    blockers: [
      rect(0, 0, 7.4, 6),
      rect(-3, -5.4, 2, 1),
      rect(3, -5.4, 2, 1),
      rect(-2.95, -7.4, 3.1, 0.2),
      rect(2.95, -7.4, 3.1, 0.2),
    ],
    build: buildCafe,
  },
  {
    key: "cinema",
    center: { x: 26, z: 2 },
    hit: [10.4, 9, 9],
    signY: 10.4,
    spot: { x: 26, z: -4.6 },
    blockers: [rect(0, 0, 10.2, 7.2), rect(-1.5, -5.3, 0.2, 2.2), rect(1.5, -5.3, 0.2, 2.2)],
    build: buildTheater,
  },
  {
    key: "post_office",
    center: { x: 0, z: -24 },
    hit: [9, 6, 8],
    signY: 8.6,
    spot: { x: 0, z: -29.4 },
    blockers: [
      rect(0, 0, 8.2, 6.2),
      rect(-3.2, -4.6, 0.7, 0.7),
      rect(3.4, -4.6, 0.7, 0.7),
      rect(4.7, -0.5, 1.2, 2),
    ],
    build: buildPostOffice,
  },
  {
    key: "bus_station",
    center: { x: 27, z: -24 },
    hit: [13, 6, 12],
    signY: 10,
    spot: { x: 29, z: -29 },
    blockers: [
      rect(0, 0, 11.2, 7.2),
      rect(-1.4, -7.6, 6.6, 2.4),
      rect(4.6, -6.6, 2.8, 0.4),
      rect(6.45, -0.7, 0.9, 3.2),
    ],
    build: buildBusStation,
  },
  {
    key: "farm",
    center: { x: -28, z: -24 },
    hit: [16, 6, 12],
    signY: 8.4,
    signOffset: { x: -4, z: 2.5 },
    spot: { x: -25.5, z: -21.6 },
    blockers: [
      rect(-4, 2.5, 6.2, 5.2),
      rect(0.4, 3.5, 1.9, 1.9),
      rect(0.7, 0.6, 2.4, 1.4),
      rect(5, -3.5, 6.6, 5),
      rect(-4, -6.5, 7.2, 4.2),
      rect(1, -0.5, 1.8, 1.2),
      rect(-0.5, -2.8, 1.8, 1.2),
    ],
    build: buildFarm,
  },
];

/** Đường lát đá (chỉ để nhìn): mỗi tuyến là một dãy điểm. */
const PATHS: Point[][] = [
  // Quảng trường → thư viện, trường học, chợ, lâu đài.
  [
    { x: -1.5, z: 10.5 },
    { x: -3, z: 15 },
    { x: -4, z: 19.6 },
  ],
  [
    { x: -6.5, z: 8.5 },
    { x: -14, z: 14 },
    { x: -22, z: 18.5 },
    { x: -30, z: 21 },
  ],
  [
    { x: 6.5, z: 8.5 },
    { x: 13, z: 13 },
    { x: 19, z: 16 },
  ],
  [
    { x: 23, z: 29 },
    { x: 27, z: 31.5 },
    { x: 30, z: 33.5 },
  ],
  // Quảng trường → quán cà phê, rạp phim.
  [
    { x: -9, z: 0 },
    { x: -16, z: -2 },
    { x: -24, z: -3.4 },
  ],
  [
    { x: 9, z: 0.5 },
    { x: 17, z: -2.5 },
    { x: 26, z: -5.4 },
  ],
  // Qua 3 cầu xuống phía nam: nông trại, bưu điện, trạm xe buýt.
  [
    { x: 0, z: -7 },
    { x: 0, z: -15 },
    { x: -6.8, z: -19 },
    { x: -6.8, z: -28 },
    { x: -2, z: -30.5 },
    { x: 4, z: -30.5 },
  ],
  [
    { x: -16, z: -2 },
    { x: -16, z: -15 },
    { x: -21, z: -19.5 },
    { x: -27, z: -21 },
  ],
  [
    { x: 17, z: -2.5 },
    { x: 22, z: -7 },
    { x: 22, z: -15 },
    { x: 24, z: -18 },
    { x: 33, z: -18 },
    { x: 34.5, z: -29.5 },
  ],
  // Bưu điện → bến tàu.
  [
    { x: -2, z: -30.5 },
    { x: -6, z: -35 },
    { x: -6, z: -38.5 },
  ],
];

/** Kênh nước ngang đảo (z) và sông phía đông (x), 3 cây cầu bắc qua kênh. */
const CANAL_Z = -10;
const CANAL_WIDTH = 4.6;
const RIVER_X = 41;
const RIVER_WIDTH = 5;
const BRIDGES_X = [-16, 0, 22];

function pathStrip(kit: LowPolyKit, points: Point[], width = 3.6) {
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    kit.cylinder({ height: 0.06, top: width + 0.8, sides: 16 }, C.pathEdge, { position: [p.x, 0.03, p.z] });
    kit.cylinder({ height: 0.1, top: width, sides: 16 }, C.path, { position: [p.x, 0.05, p.z] });
    if (i === 0) continue;
    const a = points[i - 1];
    const length = Math.hypot(p.x - a.x, p.z - a.z);
    const angle = Math.atan2(p.x - a.x, p.z - a.z);
    const mid: [number, number, number] = [(a.x + p.x) / 2, 0, (a.z + p.z) / 2];
    kit.box([width + 0.8, 0.06, length], C.pathEdge, {
      position: [mid[0], 0.03, mid[2]],
      rotation: [0, angle, 0],
    });
    kit.box([width, 0.1, length], C.path, { position: [mid[0], 0.05, mid[2]], rotation: [0, angle, 0] });
    // Viên đá lát lốm đốm.
    for (let t = 0.5; t < length; t += 1.6) {
      const x = a.x + ((p.x - a.x) * t) / length;
      const z = a.z + ((p.z - a.z) * t) / length;
      const side = Math.sin(t * 7.3) * (width / 2 - 0.5);
      kit.box([0.45, 0.105, 0.35], "#dac79c", {
        position: [x + Math.cos(angle) * side, 0.055, z - Math.sin(angle) * side],
        rotation: [0, angle + t, 0],
      });
    }
  }
}

function buildGround(kit: LowPolyKit) {
  const width = TOWN_HALF_EXTENT * 2;
  const depth = TOWN_HALF_EXTENT - SOUTH_SHORE;
  const cz = (TOWN_HALF_EXTENT + SOUTH_SHORE) / 2;
  kit.useGroup("ground");
  kit.box([width, 0.6, depth], C.grass, { position: [0, -0.3, cz] });
  // Bãi cát phía nam (quanh bến tàu).
  kit.box([34, 0.62, 5], C.sand, { position: [-4, -0.29, SOUTH_SHORE + 2.5] });
  // Vách đá quanh đảo, xuống tận mặt biển.
  kit.useGroup("cliffs");
  kit.box([width + 0.6, 4, depth + 0.6], C.rock, { position: [0, -2.6, cz] });
  const random2 = seeded(11);
  for (let x = -TOWN_HALF_EXTENT; x <= TOWN_HALF_EXTENT; x += 3.2)
    kit.box([3.4, 3.4 + random2(), 1.2], random2() > 0.5 ? C.rockDark : C.rock, {
      position: [x, -2.2, SOUTH_SHORE - 0.4],
      rotation: [0, random2() * 0.3, 0],
    });
  for (let i = 0; i < 14; i++)
    kit.ball(0.8 + random2() * 1.4, random2() > 0.5 ? C.rockDark : C.rock, {
      position: [-TOWN_HALF_EXTENT + random2() * width, -2 + random2(), SOUTH_SHORE - 1.5 - random2() * 3],
    });
  // Biển quanh đảo.
  kit.useGroup("sea");
  kit.box([520, 0.2, 520], C.waterDeep, { position: [0, -3.2, 0] }, { glow: 0.12 });
  kit.box([width + 8, 0.22, depth + 8], C.water, { position: [0, -3.15, cz] }, { glow: 0.16 });
}

function buildWater(kit: LowPolyKit) {
  kit.useGroup("water");
  const west = -TOWN_HALF_EXTENT;
  const east = RIVER_X + RIVER_WIDTH / 2;
  // Kênh ngang: nước + bờ kè đá 2 bên (ngắt ở chỗ cầu).
  kit.box(
    [east - west, 0.1, CANAL_WIDTH],
    C.water,
    { position: [(west + east) / 2, 0.04, CANAL_Z] },
    { glow: 0.35 },
  );
  const gaps = [west, ...BRIDGES_X.flatMap((x) => [x - 2.2, x + 2.2]), east - RIVER_WIDTH];
  for (let i = 0; i < gaps.length; i += 2) {
    const from = gaps[i];
    const to = gaps[i + 1];
    for (const side of [-1, 1])
      kit.box([to - from, 0.45, 0.4], C.stone, {
        position: [(from + to) / 2, 0.22, CANAL_Z + side * (CANAL_WIDTH / 2 + 0.2)],
      });
    blockers.push(rect((from + to) / 2, CANAL_Z, to - from, CANAL_WIDTH + 0.8));
  }
  // Sông phía đông chảy từ thác dưới lâu đài xuống kênh.
  const riverFrom = CANAL_Z - CANAL_WIDTH / 2;
  const riverTo = 36;
  kit.box(
    [RIVER_WIDTH, 0.1, riverTo - riverFrom],
    C.water,
    { position: [RIVER_X, 0.04, (riverFrom + riverTo) / 2] },
    { glow: 0.18 },
  );
  for (const side of [-1, 1])
    kit.box([0.4, 0.45, riverTo - riverFrom - CANAL_WIDTH], C.stone, {
      position: [RIVER_X + side * (RIVER_WIDTH / 2 + 0.2), 0.22, (riverFrom + CANAL_WIDTH + riverTo) / 2],
    });
  blockers.push(rect(RIVER_X, (riverFrom + riverTo) / 2, RIVER_WIDTH + 0.8, riverTo - riverFrom));
  // Thác nước đổ từ cao nguyên.
  kit.box([RIVER_WIDTH - 0.6, 3.4, 0.5], C.foam, { position: [RIVER_X, 1.7, riverTo - 0.2] }, { glow: 0.5 });
  for (let i = 0; i < 5; i++)
    kit.box(
      [0.3, 3.4, 0.55],
      C.water,
      { position: [RIVER_X - 1.6 + i * 0.8, 1.7, riverTo - 0.25] },
      { glow: 0.4 },
    );
  for (let i = 0; i < 6; i++)
    kit.ball(0.45, C.foam, { position: [RIVER_X - 1.8 + i * 0.7, 0.25, riverTo - 1] }, 1, { glow: 0.4 });
  // Kênh đổ ra biển phía tây: thác nhỏ ở mép đảo.
  kit.box([0.5, 2.8, CANAL_WIDTH - 0.4], C.foam, { position: [west - 0.2, -1.4, CANAL_Z] }, { glow: 0.5 });
  // 3 cầu đá cong.
  kit.useGroup("bridges");
  for (const x of BRIDGES_X) {
    kit.box([4, 0.16, CANAL_WIDTH + 2.4], C.stone, { position: [x, 0.08, CANAL_Z] });
    for (const side of [-1, 1]) {
      kit.box([0.4, 0.7, CANAL_WIDTH + 2.4], C.stoneDark, { position: [x + side * 2, 0.45, CANAL_Z] });
      for (const dz of [-1, 1])
        kit.box([0.55, 0.95, 0.55], C.stone, {
          position: [x + side * 2, 0.5, CANAL_Z + dz * (CANAL_WIDTH / 2 + 1.1)],
        });
      blockers.push(rect(x + side * 2, CANAL_Z, 0.4, CANAL_WIDTH + 2.4));
    }
    kit.cylinder({ height: 3.6, top: 1.6, sides: 10 }, C.stoneDark, {
      position: [x, -0.5, CANAL_Z],
      rotation: [0, 0, Math.PI / 2],
    });
  }
}

/** Bến tàu gỗ + thuyền buồm (nhóm "boat" để nhấp nhô) + hải đăng. */
function buildCoast(kit: LowPolyKit) {
  kit.useGroup("dock");
  const x = -6;
  const z0 = SOUTH_SHORE + 1;
  const z1 = SOUTH_SHORE - 8;
  kit.box([3.2, 0.25, z0 - z1], C.woodLight, { position: [x, 0.05, (z0 + z1) / 2] });
  for (let z = z1 + 0.6; z < z0; z += 2)
    for (const side of [-1.4, 1.4])
      kit.cylinder({ height: 3.4, top: 0.28, sides: 6 }, C.wood, { position: [x + side, -1.5, z] });
  for (let z = z1 + 0.3; z < z0; z += 0.7) kit.box([3.2, 0.04, 0.08], C.wood, { position: [x, 0.19, z] });
  kit.useGroup("boat");
  const bx = x + 4.2;
  const bz = z1 + 2;
  kit.box([2.2, 1, 5.2], "#f7f2e6", { position: [bx, -2.4, bz] });
  kit.box([2.3, 0.3, 5.3], C.red, { position: [bx, -1.9, bz] });
  kit.cone({ height: 1.6, diameter: 2.2, sides: 4 }, "#f7f2e6", {
    position: [bx, -2.4, bz - 3.3],
    rotation: [-Math.PI / 2, Math.PI / 4, 0],
    scaling: [1, 1, 0.65],
  });
  kit.cylinder({ height: 6, top: 0.12, sides: 6 }, C.wood, { position: [bx, 1, bz] });
  kit.roof({ length: 0.06, width: 3.4, height: 4.6 }, C.white, {
    position: [bx, -1.2, bz + 0.2],
    rotation: [0, Math.PI / 2, 0],
  });
  kit.box([0.04, 0.5, 0.9], C.red, { position: [bx, 4.2, bz + 0.5] });
  kit.useGroup("lighthouse");
  const lx = 41;
  const lz = SOUTH_SHORE + 4;
  blockers.push(rect(lx, lz, 3, 3));
  kit.cylinder({ height: 0.6, top: 3.4, sides: 10 }, C.stoneDark, { position: [lx, 0.3, lz] });
  for (let i = 0; i < 5; i++)
    kit.cylinder(
      { height: 1.5, top: 2.2 - (i + 1) * 0.16, bottom: 2.2 - i * 0.16, sides: 10 },
      i % 2 ? C.white : C.red,
      {
        position: [lx, 0.6 + i * 1.5 + 0.75, lz],
      },
    );
  kit.cylinder({ height: 1.1, top: 1.3, sides: 10 }, "#fff2a0", { position: [lx, 8.6, lz] }, { glow: 1 });
  kit.cone({ height: 1.4, diameter: 1.9, sides: 10 }, C.red, { position: [lx, 9.85, lz] });
}

/** (x, z) cách đường lát đá gần nhất chưa tới `distance`? */
function onPath(x: number, z: number, distance: number) {
  return PATHS.some((path) =>
    path.some((p, i) => {
      if (i === 0) return Math.hypot(p.x - x, p.z - z) < distance;
      const a = path[i - 1];
      const dx = p.x - a.x;
      const dz = p.z - a.z;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
      return Math.hypot(a.x + dx * t - x, a.z + dz * t - z) < distance;
    }),
  );
}

/** Cây, bụi hoa, đèn rải khắp đảo, tránh nhà, nước và đường đi. */
function buildScenery(kit: LowPolyKit) {
  kit.useGroup("lamps");
  for (const path of PATHS)
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1];
      const b = path[i];
      const length = Math.hypot(b.x - a.x, b.z - a.z);
      if (length < 6) continue;
      const nx = -(b.z - a.z) / length;
      const nz = (b.x - a.x) / length;
      const x = (a.x + b.x) / 2 + nx * 2.7;
      const z = (a.z + b.z) / 2 + nz * 2.7;
      if (Math.abs(z - CANAL_Z) < CANAL_WIDTH / 2 + 2.5 || Math.abs(x - RIVER_X) < RIVER_WIDTH / 2 + 1.5)
        continue;
      if (onPath(x, z, 2.4)) continue;
      lamp(kit, x, z);
    }

  kit.useGroup("trees");
  const occupied = [...blockers];
  for (const place of LAYOUT) {
    const [w, , d] = place.hit;
    occupied.push(rect(place.center.x, place.center.z, w + 2, d + 2));
  }
  const nearPath = (x: number, z: number) => onPath(x, z, 3.4);
  const free = (x: number, z: number, r: number) =>
    !nearPath(x, z) &&
    Math.hypot(x, z - 2) > 11.5 &&
    !occupied.some((o) => Math.abs(o.x - x) < o.width / 2 + r && Math.abs(o.z - z) < o.depth / 2 + r);
  const random = seeded(2026);
  let placed = 0;
  for (let attempt = 0; attempt < 2400 && placed < 190; attempt++) {
    const x = (random() - 0.5) * (TOWN_HALF_EXTENT * 2 - 4);
    const z = SOUTH_SHORE + 5 + random() * (TOWN_HALF_EXTENT - SOUTH_SHORE - 7);
    const size = 0.85 + random() * 0.5;
    if (!free(x, z, 1.4 * size)) continue;
    // Rìa đảo nhiều cây hơn, giữa đảo thưa.
    const edge = Math.min(TOWN_HALF_EXTENT - Math.abs(x), TOWN_HALF_EXTENT - z, z - SOUTH_SHORE);
    if (edge > 12 && random() < 0.55) continue;
    occupied.push(rect(x, z, 2.4 * size, 2.4 * size));
    if (random() < 0.35) pine(kit, x, z, size);
    else tree(kit, x, z, size, placed);
    placed++;
  }
  kit.useGroup("bushes");
  const flowers = ["#f26d8f", "#ffd34d", "#ff8a3d", "#c86bfa", undefined];
  for (let attempt = 0, count = 0; attempt < 900 && count < 70; attempt++) {
    const x = (random() - 0.5) * (TOWN_HALF_EXTENT * 2 - 4);
    const z = SOUTH_SHORE + 4 + random() * (TOWN_HALF_EXTENT - SOUTH_SHORE - 6);
    if (!free(x, z, 0.8)) continue;
    occupied.push(rect(x, z, 1.4, 1.4));
    bush(kit, x, z, 0.8 + random() * 0.5, flowers[count % flowers.length]);
    count++;
  }
}

/**
 * Mặt cỏ tự nhiên: lưới tam giác low-poly, mỗi tam giác một sắc xanh (loang theo vùng như cỏ thật:
 * chỗ đậm, chỗ nhạt, chỗ ngả vàng), nằm ngay trên khối đất.
 */
function naturalGrass(scene: Scene) {
  const width = TOWN_HALF_EXTENT * 2;
  const depth = TOWN_HALF_EXTENT - SOUTH_SHORE;
  const ground = MeshBuilder.CreateGround("grass", { width, height: depth, subdivisions: 56 }, scene);
  ground.position.set(0, 0.01, (TOWN_HALF_EXTENT + SOUTH_SHORE) / 2);
  ground.convertToFlatShadedMesh();
  const positions = ground.getVerticesData(VertexBuffer.PositionKind)!;
  const colors = new Float32Array((positions.length / 3) * 4);
  const light = Color3.FromHexString("#93d662");
  const mid = Color3.FromHexString("#79c652");
  const dark = Color3.FromHexString("#5eae43");
  const dry = Color3.FromHexString("#b7cf63");
  const random = seeded(99);
  for (let t = 0; t < positions.length / 9; t++) {
    // Tâm tam giác.
    let cx = 0;
    let cz = 0;
    for (let k = 0; k < 3; k++) {
      cx += positions[t * 9 + k * 3] / 3;
      cz += positions[t * 9 + k * 3 + 2] / 3;
    }
    // Nhiễu mượt theo vùng + chút ngẫu nhiên từng tam giác.
    const n =
      Math.sin(cx * 0.11 + 1.3) * Math.cos(cz * 0.09 - 0.7) * 0.5 +
      Math.sin((cx + cz) * 0.23) * 0.25 +
      (random() - 0.5) * 0.35;
    const base =
      n > 0.25 ? Color3.Lerp(mid, light, Math.min(1, n)) : Color3.Lerp(mid, dark, Math.min(1, -n + 0.1));
    const c = n > 0.55 ? Color3.Lerp(base, dry, 0.5) : base;
    for (let k = 0; k < 3; k++) colors.set([c.r, c.g, c.b, 1], (t * 3 + k) * 4);
  }
  ground.setVerticesData(VertexBuffer.ColorKind, colors);
  const material = new StandardMaterial("grass-mat", scene);
  material.diffuseColor = Color3.White();
  material.specularColor = Color3.Black();
  material.emissiveColor = new Color3(0.08, 0.09, 0.06);
  ground.material = material;
  ground.metadata = { ground: true };
  ground.freezeWorldMatrix();
  return ground;
}

/**
 * Hiệu ứng nổi bật địa điểm khi rê chuột: ngôi nhà được phủ ánh vàng + viền vàng (nhấp nháy nhẹ), vòng sáng
 * vàng quanh chân nhà, biển tên đổi sang vàng, phóng to và nổi lên trên cùng.
 */
function createHighlighter(
  scene: Scene,
  merged: Map<string, import("@babylonjs/core").Mesh>,
  signs: Map<TownPlaceKey, PlaceSign>,
) {
  const gold = new Color3(1, 0.82, 0.25);

  const ringMaterial = new StandardMaterial("place-ring", scene);
  ringMaterial.disableLighting = true;
  ringMaterial.emissiveColor = gold.clone();
  ringMaterial.alpha = 0.85;
  const ring = MeshBuilder.CreateTorus(
    "hit-ring",
    { diameter: 1, thickness: 0.035, tessellation: 40 },
    scene,
  );
  ring.material = ringMaterial;
  ring.isPickable = false;
  ring.setEnabled(false);

  let current: TownPlaceKey | null = null;
  let time = 0;
  let ringSize = { w: 1, d: 1 };
  scene.onBeforeRenderObservable.add(() => {
    if (!current) return;
    time += Math.min(scene.getEngine().getDeltaTime() / 1000, 0.1);
    const pulse = 1 + Math.sin(time * 6) * 0.04;
    ring.scaling.set(ringSize.w * pulse, 1, ringSize.d * pulse);
    ringMaterial.alpha = 0.65 + Math.sin(time * 6) * 0.25;
    const mesh = merged.get(`place-${current}`);
    if (mesh) mesh.overlayAlpha = 0.16 + Math.sin(time * 5) * 0.08;
  });

  return (place: TownPlaceKey | null) => {
    if (place === current) return;
    if (current) {
      const mesh = merged.get(`place-${current}`);
      if (mesh) {
        mesh.renderOverlay = false;
        mesh.renderOutline = false;
      }
      signs.get(current)?.setHighlighted(false);
      ring.setEnabled(false);
    }
    current = place;
    if (!place) return;
    const mesh = merged.get(`place-${place}`);
    if (mesh) {
      // Phủ một lớp vàng mờ + viền vàng chỉ trên ngôi nhà này (không đổi vật liệu dùng chung).
      mesh.overlayColor = gold;
      mesh.overlayAlpha = 0.18;
      mesh.renderOverlay = true;
      mesh.outlineColor = gold;
      mesh.outlineWidth = 0.07;
      mesh.renderOutline = true;
    }
    signs.get(place)?.setHighlighted(true);
    const layout = LAYOUT.find((item) => item.key === place)!;
    const [w, , d] = layout.hit;
    // Hình bầu dục ôm quanh chân nhà (vòng tròn đường kính 1, kéo giãn theo kích thước).
    ringSize = { w: w * 1.15 + 1.5, d: d * 1.15 + 1.5 };
    ring.position.set(layout.center.x, 0.14, layout.center.z);
    ring.setEnabled(true);
    time = 0;
  };
}

/** Dựng toàn bộ thị trấn tiếng Anh vào `scene`. */
export function buildEnglishTown(scene: Scene, fonts: { title: string; subtitle: string }): TownMap {
  const kit = new LowPolyKit(scene);
  blockers = [];
  buildGround(kit);
  naturalGrass(scene);
  buildWater(kit);
  buildCoast(kit);
  buildCastle(kit);
  const windmillHub = buildWindmill(kit, -44, -18);
  kit.useGroup("paths");
  for (const path of PATHS) pathStrip(kit, path);

  const signs: PlaceSign[] = [];
  const signByPlace = new Map<TownPlaceKey, PlaceSign>();
  for (const place of LAYOUT) {
    kit.useGroup(`place-${place.key}`);
    const node = new TransformNode(`place-${place.key}`, scene);
    node.position.set(place.center.x, 0, place.center.z);
    place.build(kit, node);

    // Khối vô hình để bấm chọn cả địa điểm.
    const [w, h, d] = place.hit;
    const hit = MeshBuilder.CreateBox(`hit-${place.key}`, { width: w, height: h, depth: d }, scene);
    hit.parent = node;
    hit.position.y = h / 2;
    hit.isVisible = false;
    hit.metadata = { place: place.key };
    hit.computeWorldMatrix(true);

    const info = TOWN_PLACES[place.key];
    const sign = new PlaceSign(scene, {
      title: info.en,
      subtitle: info.vi,
      font: fonts.title,
      subtitleFont: fonts.subtitle,
      x: place.center.x + (place.signOffset?.x ?? 0),
      y: place.signY,
      z: place.center.z + (place.signOffset?.z ?? 0),
    });
    sign.mesh.metadata = { place: place.key };
    signs.push(sign);
    signByPlace.set(place.key, sign);
  }
  buildScenery(kit);

  const merged = kit.mergeAll();
  // Mặt đất, đường, cầu, bến: bấm vào để đi tới đó.
  for (const name of ["ground", "paths", "bridges", "dock", "place-square", "place-market"]) {
    const mesh = merged.get(name);
    if (!mesh) continue;
    mesh.isPickable = true;
    mesh.metadata = { ground: true };
  }
  // Phần chuyển động: cánh quạt cối xay gió quay, thuyền nhấp nhô.
  const sails = merged.get("windmill-sails");
  const boat = merged.get("boat");
  sails?.unfreezeWorldMatrix();
  boat?.unfreezeWorldMatrix();
  sails?.setPivotPoint(windmillHub);
  let time = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.1);
    time += dt;
    if (sails) sails.rotation.z += dt * 0.8;
    if (boat) {
      boat.position.y = Math.sin(time * 1.4) * 0.12;
      boat.rotation.z = Math.sin(time * 1.1) * 0.02;
    }
  });

  // Lưới đi lại: mép đảo, biển, nhà, cây, nước... là vật cản.
  const grid = new WalkGrid(TOWN_HALF_EXTENT - 0.5);
  for (const place of LAYOUT)
    for (const b of place.blockers)
      grid.block(rect(place.center.x + b.x, place.center.z + b.z, b.width, b.depth));
  for (const b of blockers) grid.block(b);
  // Biển phía nam (chừa bến tàu).
  const seaDepth = SOUTH_SHORE + TOWN_HALF_EXTENT;
  const seaZ = SOUTH_SHORE - seaDepth / 2;
  grid.block(rect((-TOWN_HALF_EXTENT - 7.6) / 2, seaZ, TOWN_HALF_EXTENT - 7.6, seaDepth));
  grid.block(rect((TOWN_HALF_EXTENT - 4.4) / 2, seaZ, TOWN_HALF_EXTENT + 4.4, seaDepth));
  blockers = [];

  const square = LAYOUT.find((item) => item.key === "square")!;
  return {
    grid,
    places: LAYOUT.map(({ key, spot }) => ({ key, spot, facing: { x: 0, z: 1 } })),
    spawn: square.spot,
    isPlaceMesh: (mesh) => {
      const value = (mesh.metadata as { place?: TownPlaceKey } | null | undefined)?.place;
      return value ?? null;
    },
    redrawSigns: () => signs.forEach((sign) => sign.draw()),
    highlight: createHighlighter(scene, merged, signByPlace),
    life: {
      fountain: new Vector3(square.center.x, 2.6, square.center.z),
      waterfall: new Vector3(RIVER_X, 0.3, 34.6),
      // Ống khói quán cà phê, bưu điện; tách cà phê trên mái quán.
      chimneys: [new Vector3(-26.4, 6.3, 6), new Vector3(2.6, 6.1, -22.6)],
      steam: [new Vector3(-22.6, 7.6, 5)],
    },
  };
}
