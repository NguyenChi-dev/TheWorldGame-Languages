import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  TransformNode,
  VertexData,
} from "@babylonjs/core";

/**
 * Bộ dựng khối low-poly cho bản đồ: hộp, trụ, nón, cầu nhiều mặt, mái nhà tam giác...
 * Mọi khối đều đổ bóng phẳng (flat shading) cho đúng chất low-poly.
 *
 * Khối tĩnh (nhà, cây, đường) gom theo nhóm rồi GỘP thành ít mesh (merge) để vẽ nhanh: cả bản đồ
 * chỉ còn vài chục lệnh vẽ thay vì hàng nghìn.
 */

export interface Place3D {
  /** Vị trí và hướng của khối, tính trong hệ tọa độ của `parent`. */
  parent?: TransformNode;
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Tỉ lệ thêm (ngoài kích thước). */
  scaling?: [number, number, number];
}

const sharedMaterials = new WeakMap<Scene, Map<string, StandardMaterial>>();

export class LowPolyKit {
  /** Vật liệu theo màu, dùng chung cho mọi bộ dựng trong cùng scene (editor dựng hàng trăm mẫu). */
  private readonly materials: Map<string, StandardMaterial>;
  private readonly groups = new Map<string, Mesh[]>();
  private group = "default";

  constructor(readonly scene: Scene) {
    let cache = sharedMaterials.get(scene);
    if (!cache) {
      cache = new Map();
      sharedMaterials.set(scene, cache);
    }
    this.materials = cache;
  }

  /** Màu → vật liệu (dùng chung). `glow` > 0: tự phát sáng (đèn, cửa sổ ban đêm...). */
  material(hex: string, options: { alpha?: number; glow?: number } = {}) {
    const k = `${hex}/${options.alpha ?? 1}/${options.glow ?? 0}`;
    let mat = this.materials.get(k);
    if (!mat) {
      mat = new StandardMaterial(`lp-${k}`, this.scene);
      const color = Color3.FromHexString(hex);
      mat.diffuseColor = color;
      mat.specularColor = Color3.Black();
      mat.emissiveColor = color.scale(options.glow ?? 0.14);
      mat.alpha = options.alpha ?? 1;
      this.materials.set(k, mat);
    }
    return mat;
  }

  /** Các khối dựng sau lệnh này thuộc nhóm `name` (gộp chung khi gọi mergeAll). */
  useGroup(name: string) {
    this.group = name;
  }

  private finish(mesh: Mesh, color: string, place: Place3D, flat = true, alpha?: number, glow?: number) {
    if (flat) mesh.convertToFlatShadedMesh();
    if (place.parent) mesh.parent = place.parent;
    if (place.position) mesh.position.set(...place.position);
    if (place.rotation) mesh.rotation.set(...place.rotation);
    if (place.scaling) mesh.scaling.set(...place.scaling);
    mesh.material = this.material(color, { alpha, glow });
    mesh.isPickable = false;
    const list = this.groups.get(this.group) ?? [];
    list.push(mesh);
    this.groups.set(this.group, list);
    return mesh;
  }

  box(
    size: [number, number, number],
    color: string,
    place: Place3D = {},
    options: { alpha?: number; glow?: number } = {},
  ) {
    const [width, height, depth] = size;
    return this.finish(
      MeshBuilder.CreateBox("lp-box", { width, height, depth }, this.scene),
      color,
      place,
      false,
      options.alpha,
      options.glow,
    );
  }

  cylinder(
    options: { height: number; top: number; bottom?: number; sides?: number },
    color: string,
    place: Place3D = {},
    look: { alpha?: number; glow?: number } = {},
  ) {
    const mesh = MeshBuilder.CreateCylinder(
      "lp-cyl",
      {
        height: options.height,
        diameterTop: options.top,
        diameterBottom: options.bottom ?? options.top,
        tessellation: options.sides ?? 8,
      },
      this.scene,
    );
    return this.finish(mesh, color, place, true, look.alpha, look.glow);
  }

  /** Nón (đáy rộng `diameter`, đỉnh nhọn). */
  cone(options: { height: number; diameter: number; sides?: number }, color: string, place: Place3D = {}) {
    return this.cylinder(
      { height: options.height, top: 0, bottom: options.diameter, sides: options.sides },
      color,
      place,
    );
  }

  ball(radius: number, color: string, place: Place3D = {}, detail = 1, look: { glow?: number } = {}) {
    return this.finish(
      MeshBuilder.CreateIcoSphere("lp-ball", { radius, subdivisions: detail, flat: true }, this.scene),
      color,
      place,
      false,
      undefined,
      look.glow,
    );
  }

  /**
   * Mái nhà hình lăng trụ tam giác: dài `length` theo trục x, rộng `width` theo trục z, cao `height`.
   * `position` là tâm ĐÁY mái.
   */
  roof(size: { length: number; width: number; height: number }, color: string, place: Place3D = {}) {
    const l = size.length / 2;
    const w = size.width / 2;
    const h = size.height;
    // 6 đỉnh: tam giác đầu hồi trái (0-2) và phải (3-5).
    // prettier-ignore
    const positions = [
      -l, 0, -w,   -l, 0, w,   -l, h, 0,
       l, 0, -w,    l, 0, w,    l, h, 0,
    ];
    // Mỗi mặt khai báo cả 2 chiều để thấy được từ mọi phía (không lo thứ tự đỉnh).
    // prettier-ignore
    const faces = [
      [0, 1, 2], [3, 5, 4],             // 2 đầu hồi
      [0, 2, 5], [0, 5, 3],             // mái trước
      [1, 4, 5], [1, 5, 2],             // mái sau
      [0, 3, 4], [0, 4, 1],             // đáy
    ];
    const indices = faces.flatMap(([a, b, c]) => [a, b, c, a, c, b]);
    const data = new VertexData();
    data.positions = positions;
    data.indices = indices;
    const normals: number[] = [];
    VertexData.ComputeNormals(positions, indices, normals);
    data.normals = normals;
    // Toạ độ ảnh (không dùng) để gộp được chung với các khối có sẵn của Babylon.
    data.uvs = new Array((positions.length / 3) * 2).fill(0);
    const mesh = new Mesh("lp-roof", this.scene);
    data.applyToMesh(mesh);
    return this.finish(mesh, color, place);
  }

  /** Nhận một mesh tự dựng (ví dụ hình xuyến): tô màu, đặt vị trí, đưa vào nhóm hiện tại. */
  adopt(mesh: Mesh, color: string, place: Place3D = {}) {
    return this.finish(mesh, color, place);
  }

  /** Gộp mỗi nhóm thành một mesh. Trả về mesh của từng nhóm. */
  /** Gộp riêng một nhóm thành một mesh, KHÔNG khóa vị trí (vật thể còn di chuyển được, ví dụ trong editor). */
  mergeGroup(name: string): Mesh | null {
    const meshes = this.groups.get(name);
    this.groups.delete(name);
    if (!meshes?.length) return null;
    const mesh = Mesh.MergeMeshes(meshes, true, true, undefined, false, true);
    if (mesh) mesh.name = name;
    return mesh;
  }

  mergeAll(): Map<string, Mesh> {
    const merged = new Map<string, Mesh>();
    for (const [name, meshes] of this.groups) {
      if (meshes.length === 0) continue;
      const mesh = Mesh.MergeMeshes(meshes, true, true, undefined, false, true);
      if (!mesh) continue;
      mesh.name = `map-${name}`;
      mesh.isPickable = false;
      mesh.freezeWorldMatrix();
      merged.set(name, mesh);
    }
    this.groups.clear();
    return merged;
  }
}
