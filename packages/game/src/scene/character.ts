import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, TransformNode } from "@babylonjs/core";
import {
  BOTTOMS,
  HAIR_COLOR,
  HATS,
  SKIN_COLOR,
  TOPS,
  type BottomPart,
  type CharacterAppearance,
  type OutfitPart,
  type TopPart,
} from "@lw/shared";

/**
 * Nhân vật low-poly dựng hoàn toàn bằng khối cơ bản (không cần file mô hình), theo ngoại hình
 * người chơi tự phối: nam / nữ + mũ nón + áo + váy / quần (xem packages/shared/src/characters.ts).
 *
 * Gốc (root) đặt ở chân nhân vật, mặt nhìn về hướng -Z. Cao khoảng 1.8 đơn vị (1 ô đất = 2).
 */

/** Vật liệu theo màu, dùng chung trong một scene (nhiều nhân vật cùng màu không tạo vật liệu mới). */
const materialCache = new WeakMap<Scene, Map<string, StandardMaterial>>();

function material(scene: Scene, hex: string, alpha = 1) {
  let cache = materialCache.get(scene);
  if (!cache) {
    cache = new Map();
    materialCache.set(scene, cache);
  }
  const key = `${hex}/${alpha}`;
  let mat = cache.get(key);
  if (!mat) {
    mat = new StandardMaterial(`char-${key}`, scene);
    mat.diffuseColor = Color3.FromHexString(hex);
    mat.specularColor = Color3.Black();
    // Sáng nhẹ để màu tươi như tranh, không bị tối ở mặt khuất sáng.
    mat.emissiveColor = Color3.FromHexString(hex).scale(0.18);
    mat.alpha = alpha;
    cache.set(key, mat);
  }
  return mat;
}

interface PartOptions {
  color: string;
  parent: TransformNode;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scaling?: [number, number, number];
  alpha?: number;
}

/** Số đo cơ thể theo giới tính. */
const BODY = {
  female: { shoulder: 0.34, waist: 0.46, armX: 0.235 },
  male: { shoulder: 0.43, waist: 0.47, armX: 0.27 },
} as const;

/** Mũ búi tóc lên: tóc nữ không thả dài sau lưng nữa. */
const UPDO_HATS = new Set(["kanzashi", "crown"]);

export class CharacterModel {
  /** Gốc: đặt vị trí, hướng nhìn của nhân vật bằng node này. */
  readonly root: TransformNode;
  /** Phần thân (mọi thứ trừ bóng dưới chân): nhún nhảy khi đi. */
  private readonly body: TransformNode;
  private readonly armLeft: TransformNode;
  private readonly armRight: TransformNode;
  private readonly meshes: Mesh[] = [];
  private time = Math.random() * 10;

  constructor(
    private readonly scene: Scene,
    readonly appearance: CharacterAppearance,
    name = "character",
  ) {
    this.root = new TransformNode(`char-${name}`, scene);
    this.body = new TransformNode(`char-${name}-body`, scene);
    this.body.parent = this.root;

    const top = TOPS[appearance.top];
    const bottom = BOTTOMS[appearance.bottom];
    this.shadow();
    const hipY = this.lowerBody(bottom);
    const shoulderY = this.torso(top, bottom, hipY);
    [this.armLeft, this.armRight] = [-1, 1].map((side) => this.arm(top, side, shoulderY)) as [
      TransformNode,
      TransformNode,
    ];
    this.head(shoulderY + 0.4);
  }

  /** Mọi mesh của nhân vật. */
  get parts(): readonly Mesh[] {
    return this.meshes;
  }

  /**
   * Gọi mỗi khung hình.
   * - walking: nhún và vung tay.
   * - waving: giơ tay vẫy chào (màn chọn nhân vật).
   * - còn lại: thở nhẹ.
   */
  update(deltaSeconds: number, state: { walking?: boolean; waving?: boolean } = {}) {
    this.time += deltaSeconds;
    const t = this.time;
    const ease = Math.min(1, deltaSeconds * 10);
    const towards = (node: TransformNode, axis: "x" | "z", value: number) => {
      node.rotation[axis] += (value - node.rotation[axis]) * ease;
    };

    if (state.walking) {
      this.body.position.y = Math.abs(Math.sin(t * 9)) * 0.08;
      towards(this.armLeft, "x", Math.sin(t * 9) * 0.6);
      towards(this.armRight, "x", -Math.sin(t * 9) * 0.6);
      towards(this.armLeft, "z", -0.15);
      towards(this.armRight, "z", 0.15);
    } else if (state.waving) {
      this.body.position.y = Math.abs(Math.sin(t * 3)) * 0.05;
      towards(this.armLeft, "x", 0);
      towards(this.armLeft, "z", -0.15);
      towards(this.armRight, "x", 0);
      towards(this.armRight, "z", 2.5 + Math.sin(t * 8) * 0.35);
    } else {
      this.body.position.y = Math.sin(t * 2) * 0.012;
      for (const arm of [this.armLeft, this.armRight]) towards(arm, "x", 0);
      towards(this.armLeft, "z", -0.15 + Math.sin(t * 2) * 0.03);
      towards(this.armRight, "z", 0.15 - Math.sin(t * 2) * 0.03);
    }
  }

  dispose() {
    // Vật liệu dùng chung trong scene nên không xóa ở đây (xóa cùng scene).
    this.root.dispose(false, false);
  }

  // ---------------------------------------------------------------------------
  // Khối cơ bản
  // ---------------------------------------------------------------------------

  private add(mesh: Mesh, { color, parent, position, rotation, scaling, alpha }: PartOptions) {
    mesh.parent = parent;
    if (position) mesh.position.set(...position);
    if (rotation) mesh.rotation.set(...rotation);
    if (scaling) mesh.scaling.set(...scaling);
    mesh.material = material(this.scene, color, alpha);
    this.meshes.push(mesh);
    return mesh;
  }

  /** Hình trụ có mặt vát phẳng (low-poly). */
  private cylinder(
    options: { height: number; top: number; bottom: number; sides?: number },
    part: PartOptions,
  ) {
    const mesh = MeshBuilder.CreateCylinder(
      "part",
      {
        height: options.height,
        diameterTop: options.top,
        diameterBottom: options.bottom,
        tessellation: options.sides ?? 8,
      },
      this.scene,
    );
    mesh.convertToFlatShadedMesh();
    return this.add(mesh, part);
  }

  /** Khối cầu nhiều mặt tam giác (low-poly). */
  private ball(radius: number, part: PartOptions, detail = 2) {
    return this.add(
      MeshBuilder.CreateIcoSphere("part", { radius, subdivisions: detail, flat: true }, this.scene),
      part,
    );
  }

  private box(size: [number, number, number], part: PartOptions) {
    const [width, height, depth] = size;
    return this.add(MeshBuilder.CreateBox("part", { width, height, depth }, this.scene), part);
  }

  // ---------------------------------------------------------------------------
  // Dựng từng phần
  // ---------------------------------------------------------------------------

  private shadow() {
    const shadow = this.cylinder(
      { height: 0.01, top: 0.9, bottom: 0.9, sides: 12 },
      { color: "#1b2a1a", parent: this.root, position: [0, 0.006, 0], alpha: 0.22 },
    );
    shadow.isPickable = false;
  }

  /** Váy hoặc quần + giày. Trả về độ cao hông. */
  private lowerBody(bottom: BottomPart) {
    const parent = this.body;
    if (bottom.style === "dress") {
      this.cylinder(
        { height: 0.72, top: 0.46, bottom: 0.84 },
        { color: bottom.color, parent, position: [0, 0.36, 0] },
      );
      // Gấu váy viền màu phụ.
      this.cylinder(
        { height: 0.07, top: 0.85, bottom: 0.86 },
        { color: bottom.accent, parent, position: [0, 0.035, 0] },
      );
      return 0.72;
    }
    for (const side of [-1, 1]) {
      this.cylinder(
        { height: 0.46, top: 0.18, bottom: 0.15, sides: 6 },
        { color: bottom.color, parent, position: [side * 0.11, 0.32, 0] },
      );
      // Sọc dọc bên ngoài ống quần.
      this.box([0.025, 0.42, 0.06], {
        color: bottom.accent,
        parent,
        position: [side * 0.192, 0.33, 0],
        rotation: [0, 0, side * -0.03],
      });
      this.box([0.17, 0.1, 0.26], { color: "#2a2522", parent, position: [side * 0.11, 0.05, -0.03] });
    }
    this.cylinder(
      { height: 0.14, top: 0.44, bottom: 0.4 },
      { color: bottom.color, parent, position: [0, 0.57, 0] },
    );
    return 0.62;
  }

  /** Thân áo và chi tiết (đai, vạt áo dài, sọc, cúc, nơ, khăn). Trả về độ cao vai. */
  private torso(top: TopPart, bottom: BottomPart, hipY: number) {
    const parent = this.body;
    const { shoulder, waist } = BODY[this.appearance.gender];
    const height = 0.46;
    this.cylinder(
      { height, top: shoulder, bottom: waist },
      { color: top.color, parent, position: [0, hipY + height / 2, 0] },
    );
    /** Bán kính thân áo ở độ cao y (tính từ hông). */
    const radiusAt = (y: number) => (waist + ((shoulder - waist) * y) / height) / 2;

    if (top.panels) {
      // Áo dài: 2 vạt trước / sau buông từ eo xuống gối, ôm theo váy hoặc quần bên dưới.
      const length = 0.5;
      const slope = bottom.style === "dress" ? 0.26 : 0;
      const z = bottom.style === "dress" ? 0.3 : 0.22;
      for (const side of [-1, 1])
        this.box([0.34, length, 0.035], {
          color: top.color,
          parent,
          position: [0, hipY - length / 2 + 0.04, side * z],
          rotation: [side * slope, 0, 0],
        });
      // Cổ áo đứng.
      this.cylinder(
        { height: 0.08, top: 0.19, bottom: 0.21, sides: 8 },
        { color: top.accent, parent, position: [0, hipY + height + 0.02, 0] },
      );
    } else {
      // Thắt lưng / đai obi.
      const beltHeight = top.wideBelt ? 0.15 : 0.07;
      this.cylinder(
        { height: beltHeight, top: waist + 0.01, bottom: waist + 0.03 },
        { color: top.accent, parent, position: [0, hipY + beltHeight / 2 + 0.02, 0] },
      );
    }

    if (top.stripes) {
      for (const y of [0.17, 0.27, 0.37]) {
        const d = radiusAt(y) * 2 + 0.012;
        this.cylinder(
          { height: 0.035, top: d, bottom: d },
          { color: top.stripes, parent, position: [0, hipY + y, 0] },
        );
      }
    }
    if (top.buttons) {
      for (const y of [0.14, 0.24, 0.34])
        this.ball(0.028, { color: top.accent, parent, position: [0, hipY + y, -radiusAt(y) - 0.01] }, 1);
    }
    if (top.bow) {
      // Nơ goreum của hanbok: 2 cánh nơ + 2 dải buông.
      const y = hipY + 0.33;
      const z = -radiusAt(0.33) - 0.02;
      for (const side of [-1, 1])
        this.box([0.11, 0.06, 0.03], {
          color: top.accent,
          parent,
          position: [side * 0.06 + 0.04, y, z],
          rotation: [0, 0, side * 0.35],
        });
      this.box([0.035, 0.24, 0.02], {
        color: top.accent,
        parent,
        position: [0.03, y - 0.13, z],
        rotation: [0, 0, 0.1],
      });
      this.box([0.035, 0.2, 0.02], {
        color: top.accent,
        parent,
        position: [0.08, y - 0.11, z],
        rotation: [0, 0, -0.1],
      });
    }

    const shoulderY = hipY + height;
    // Cổ.
    this.cylinder(
      { height: 0.1, top: 0.15, bottom: 0.17, sides: 6 },
      { color: SKIN_COLOR, parent, position: [0, shoulderY + 0.03, 0] },
    );
    if (top.scarf) {
      const scarf = MeshBuilder.CreateTorus(
        "part",
        { diameter: 0.3, thickness: 0.1, tessellation: 8 },
        this.scene,
      );
      scarf.convertToFlatShadedMesh();
      this.add(scarf, { color: top.accent, parent, position: [0, shoulderY + 0.01, 0] });
      this.box([0.08, 0.22, 0.05], {
        color: top.accent,
        parent,
        position: [0.07, shoulderY - 0.1, -radiusAt(height) - 0.02],
        rotation: [0.15, 0, 0.2],
      });
    }
    return shoulderY;
  }

  /** Một cánh tay, xoay quanh vai. side = -1 trái, 1 phải. */
  private arm(top: TopPart, side: number, shoulderY: number) {
    const pivot = new TransformNode("arm", this.scene);
    pivot.parent = this.body;
    pivot.position.set(side * BODY[this.appearance.gender].armX, shoulderY - 0.04, 0);
    pivot.rotation.z = side * 0.15;
    const length = 0.42;
    this.cylinder(
      { height: length, top: 0.14, bottom: top.wideSleeves ? 0.3 : 0.14, sides: 6 },
      { color: top.color, parent: pivot, position: [0, -length / 2, 0] },
    );
    if (top.wideSleeves) {
      // Viền tay áo rộng.
      this.cylinder(
        { height: 0.04, top: 0.3, bottom: 0.31, sides: 6 },
        { color: top.accent, parent: pivot, position: [0, -length + 0.02, 0] },
      );
    }
    this.ball(0.07, { color: SKIN_COLOR, parent: pivot, position: [0, -length - 0.04, 0] }, 1);
    return pivot;
  }

  private head(headY: number) {
    const parent = this.body;
    const female = this.appearance.gender === "female";
    const r = 0.32;
    this.ball(r, { color: SKIN_COLOR, parent, position: [0, headY, 0], scaling: [1, 0.96, 0.96] });

    // Tóc: "mũ tóc" lệch ra sau và lên trên, chừa mặt phía trước. Nam tóc ngắn gọn hơn.
    if (female) {
      this.ball(r + 0.03, {
        color: HAIR_COLOR,
        parent,
        position: [0, headY + 0.07, 0.07],
        scaling: [1.04, 0.96, 0.98],
      });
      if (!UPDO_HATS.has(this.appearance.hat)) {
        // Tóc dài thả sau lưng.
        this.box([0.54, 0.66, 0.13], {
          color: HAIR_COLOR,
          parent,
          position: [0, headY - 0.3, 0.22],
          rotation: [-0.08, 0, 0],
        });
      }
    } else {
      this.ball(r + 0.02, {
        color: HAIR_COLOR,
        parent,
        position: [0, headY + 0.1, 0.06],
        scaling: [1.02, 0.86, 0.98],
      });
    }

    // Mắt, lông mày, má hồng, miệng.
    for (const side of [-1, 1]) {
      this.ball(
        0.042,
        { color: "#1d1a22", parent, position: [side * 0.11, headY - 0.03, -0.29], scaling: [1, 1.25, 0.6] },
        1,
      );
      // Lông mày: nữ mảnh, nam đậm; đầu trong hơi cao cho mặt hiền.
      this.box(female ? [0.085, 0.017, 0.02] : [0.1, 0.03, 0.03], {
        color: HAIR_COLOR,
        parent,
        position: [side * 0.11, headY + (female ? 0.075 : 0.065), -0.29],
        rotation: [0, 0, side * (female ? 0.06 : -0.12)],
      });
      this.ball(
        0.05,
        {
          color: female ? "#f29a9a" : "#efb39b",
          parent,
          position: [side * 0.19, headY - 0.11, -0.24],
          scaling: [1, 0.6, 0.4],
        },
        1,
      );
    }
    this.box([0.07, 0.022, 0.02], { color: "#9c3b3b", parent, position: [0, headY - 0.14, -0.282] });

    this.hat(HATS[this.appearance.hat], headY, female);
  }

  private hat(hat: OutfitPart, headY: number, female: boolean) {
    const parent = this.body;
    switch (this.appearance.hat) {
      case "none":
        break;
      case "conical": {
        // Nón lá + vành quai.
        this.cylinder(
          { height: 0.34, top: 0.02, bottom: 1.08, sides: 12 },
          { color: hat.color, parent, position: [0, headY + 0.3, 0.02] },
        );
        this.cylinder(
          { height: 0.02, top: 1.08, bottom: 1.08, sides: 12 },
          { color: hat.accent, parent, position: [0, headY + 0.13, 0.02] },
        );
        break;
      }
      case "kanzashi": {
        // Búi tóc + trâm ngang + bông hoa.
        this.ball(0.15, { color: HAIR_COLOR, parent, position: [0, headY + 0.33, 0.1] });
        this.cylinder(
          { height: 0.44, top: 0.03, bottom: 0.03, sides: 5 },
          {
            color: hat.color,
            parent,
            position: [0, headY + 0.34, 0.1],
            rotation: [0, 0, Math.PI / 2 - 0.25],
          },
        );
        this.ball(0.07, { color: hat.color, parent, position: [0.24, headY + 0.17, -0.1] }, 1);
        this.ball(0.035, { color: hat.accent, parent, position: [0.25, headY + 0.17, -0.16] }, 1);
        break;
      }
      case "bearskin": {
        // Mũ lông gấu cao + quai cằm.
        this.ball(0.36, { color: hat.color, parent, position: [0, headY + 0.4, 0.03], scaling: [1, 1.6, 1] });
        for (const side of [-1, 1])
          this.box([0.04, 0.3, 0.04], {
            color: hat.accent,
            parent,
            position: [side * 0.3, headY - 0.08, -0.02],
            rotation: [0, 0, side * 0.25],
          });
        break;
      }
      case "crown": {
        // Búi tóc + mũ miện vàng nhỏ + hạt ngọc + trâm.
        this.ball(0.14, { color: HAIR_COLOR, parent, position: [0, headY + 0.34, 0.05] });
        this.cylinder(
          { height: 0.12, top: 0.22, bottom: 0.18, sides: 6 },
          { color: hat.color, parent, position: [0, headY + 0.4, 0.05] },
        );
        this.ball(0.035, { color: hat.accent, parent, position: [0, headY + 0.42, -0.06] }, 1);
        this.cylinder(
          { height: 0.5, top: 0.025, bottom: 0.025, sides: 5 },
          { color: hat.color, parent, position: [0, headY + 0.4, 0.05], rotation: [0, 0, Math.PI / 2] },
        );
        break;
      }
      case "ribbon": {
        // Nơ sau gáy + dải nơ buông xuống (nữ tóc dài: nơ nằm trên tóc).
        const z = female ? 0.33 : 0.3;
        for (const side of [-1, 1])
          this.box([0.15, 0.1, 0.04], {
            color: hat.color,
            parent,
            position: [side * 0.09, headY - 0.06, z],
            rotation: [0, 0, side * 0.35],
          });
        this.ball(0.04, { color: hat.accent, parent, position: [0, headY - 0.06, z + 0.01] }, 1);
        this.box([0.06, 0.36, 0.03], {
          color: hat.color,
          parent,
          position: [0.03, headY - 0.28, z + 0.02],
          rotation: [-0.1, 0, 0.08],
        });
        break;
      }
      case "beret": {
        // Mũ nồi nghiêng.
        this.cylinder(
          { height: 0.1, top: 0.6, bottom: 0.66, sides: 10 },
          { color: hat.color, parent, position: [0.03, headY + 0.29, 0.03], rotation: [0, 0, -0.2] },
        );
        this.cylinder(
          { height: 0.07, top: 0.03, bottom: 0.06, sides: 5 },
          { color: hat.color, parent, position: [-0.03, headY + 0.37, 0.03], rotation: [0, 0, -0.2] },
        );
        break;
      }
    }
  }
}

/** Hướng quay (rotation.y) để nhân vật nhìn theo vector (dx, dz). Nhân vật mặc định nhìn về -Z. */
export function facingAngle(dx: number, dz: number) {
  return Math.atan2(-dx, -dz);
}

/** Xoay góc `current` dần về `target` theo đường ngắn nhất. */
export function turnTowards(current: number, target: number, amount: number) {
  let diff = (target - current) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * Math.min(1, amount);
}
