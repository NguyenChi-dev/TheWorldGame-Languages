import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial } from "@babylonjs/core";

const OK_COLOR = new Color3(0.45, 1, 0.55);
const BAD_COLOR = new Color3(1, 0.35, 0.3);
const RIPPLE_SECONDS = 0.55;

interface Ripple {
  mesh: Mesh;
  material: StandardMaterial;
  age: number;
}

/**
 * Hiệu ứng khi bấm chuột / chạm xuống đất:
 *   - 2 vòng sáng loang ra rồi mờ dần ngay chỗ bấm (xanh lá: đi được, đỏ: không tới được);
 *   - mũi tên nhỏ nhấp nhô ở điểm đích, tắt khi nhân vật tới nơi hoặc đổi sang điều khiển bằng phím.
 */
export class ClickMarker {
  private readonly ripples: Ripple[] = [];
  private readonly pin: Mesh;
  private readonly pinRing: Mesh;
  private readonly pinMaterial: StandardMaterial;
  private time = 0;

  constructor(private readonly scene: Scene) {
    for (let i = 0; i < 2; i++) {
      const material = new StandardMaterial("click-ripple", scene);
      material.disableLighting = true;
      material.emissiveColor = OK_COLOR.clone();
      material.alpha = 0;
      const mesh = MeshBuilder.CreateTorus(
        "click-ripple",
        { diameter: 1.6, thickness: 0.14, tessellation: 32 },
        scene,
      );
      mesh.material = material;
      mesh.isPickable = false;
      mesh.setEnabled(false);
      this.ripples.push({ mesh, material, age: RIPPLE_SECONDS });
    }

    this.pinMaterial = new StandardMaterial("click-pin", scene);
    this.pinMaterial.disableLighting = true;
    this.pinMaterial.emissiveColor = new Color3(1, 0.86, 0.35);
    this.pin = MeshBuilder.CreateCylinder(
      "click-pin",
      { height: 0.8, diameterTop: 0.62, diameterBottom: 0, tessellation: 4 },
      scene,
    );
    this.pin.material = this.pinMaterial;
    this.pin.isPickable = false;
    this.pin.setEnabled(false);
    this.pinRing = MeshBuilder.CreateTorus(
      "click-pin-ring",
      { diameter: 1, thickness: 0.09, tessellation: 24 },
      scene,
    );
    this.pinRing.material = this.pinMaterial;
    this.pinRing.isPickable = false;
    this.pinRing.setEnabled(false);

    scene.onBeforeRenderObservable.add(() =>
      this.animate(Math.min(scene.getEngine().getDeltaTime() / 1000, 0.1)),
    );
  }

  /** Vòng sáng loang ra tại (x, z). `ok` = false: đỏ (không tới được). */
  ping(x: number, z: number, ok = true) {
    this.ripples.forEach((ripple, i) => {
      ripple.mesh.position.set(x, 0.12, z);
      ripple.material.emissiveColor.copyFrom(ok ? OK_COLOR : BAD_COLOR);
      // Vòng thứ 2 xuất phát trễ một chút.
      ripple.age = -i * 0.12;
      ripple.mesh.setEnabled(true);
    });
  }

  /** Hiện mũi tên ở điểm đích (null: tắt). */
  setDestination(point: { x: number; z: number } | null) {
    this.pin.setEnabled(point !== null);
    this.pinRing.setEnabled(point !== null);
    if (!point) return;
    this.pin.position.set(point.x, 1.1, point.z);
    this.pinRing.position.set(point.x, 0.12, point.z);
  }

  private animate(dt: number) {
    this.time += dt;
    for (const ripple of this.ripples) {
      if (ripple.age >= RIPPLE_SECONDS) continue;
      ripple.age += dt;
      const t = Math.max(0, ripple.age) / RIPPLE_SECONDS;
      const ease = 1 - (1 - Math.min(1, t)) ** 3;
      ripple.mesh.scaling.setAll(0.3 + ease * 1.2);
      ripple.material.alpha = ripple.age < 0 ? 0 : Math.max(0, 1 - t) * 0.95;
      if (ripple.age >= RIPPLE_SECONDS) ripple.mesh.setEnabled(false);
    }
    if (this.pin.isEnabled()) {
      this.pin.position.y = 1 + Math.abs(Math.sin(this.time * 4)) * 0.35;
      this.pin.rotation.y += dt * 2.5;
      this.pinRing.scaling.setAll(1 + Math.sin(this.time * 6) * 0.08);
    }
  }
}
