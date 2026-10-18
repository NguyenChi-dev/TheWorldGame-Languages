import { DynamicTexture, Mesh, MeshBuilder, Scene, StandardMaterial, Color3 } from "@babylonjs/core";

export interface SignOptions {
  /** Dòng chữ lớn (tiếng Anh). */
  title: string;
  /** Dòng chữ nhỏ (tiếng Việt). */
  subtitle: string;
  /** Font cho chữ, ví dụ "'Bungee', sans-serif". */
  font: string;
  /** Font cho dòng chữ nhỏ. */
  subtitleFont: string;
  x: number;
  y: number;
  z: number;
}

const WIDTH = 640;
const HEIGHT = 240;
/** Chiều rộng biển trong thế giới 3D (1 ô đường = 3). */
const SIGN_WIDTH = 3.4;

/**
 * Biển tên địa điểm: tấm gỗ treo lơ lửng, luôn quay mặt về phía camera (billboard).
 * Chữ vẽ lên canvas (DynamicTexture) nên đổi font / vẽ lại được khi font tải xong.
 */
export class PlaceSign {
  readonly mesh: Mesh;
  private readonly texture: DynamicTexture;
  private readonly material: StandardMaterial;
  /** Đang được rê chuột lên: biển vàng, to hơn, nhấp nhô. */
  private highlighted = false;

  constructor(
    scene: Scene,
    private readonly options: SignOptions,
  ) {
    this.texture = new DynamicTexture("sign-tex", { width: WIDTH, height: HEIGHT }, scene, true);
    this.texture.hasAlpha = true;
    const mat = new StandardMaterial("sign-mat", scene);
    this.material = mat;
    mat.diffuseTexture = this.texture;
    mat.emissiveColor = new Color3(0.85, 0.85, 0.85);
    mat.specularColor = Color3.Black();
    mat.useAlphaFromDiffuseTexture = true;
    mat.backFaceCulling = false;

    this.mesh = MeshBuilder.CreatePlane(
      "sign",
      { width: SIGN_WIDTH, height: (SIGN_WIDTH * HEIGHT) / WIDTH },
      scene,
    );
    this.mesh.material = mat;
    this.mesh.position.set(options.x, options.y, options.z);
    this.mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    this.draw();

    // Phóng to / thu nhỏ mượt khi bật tắt nổi bật; nổi bật thì nhấp nhô nhẹ.
    let time = 0;
    scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.1);
      time += dt;
      const target = this.highlighted ? 1.45 : 1;
      const scale = this.mesh.scaling.x + (target - this.mesh.scaling.x) * Math.min(1, dt * 12);
      this.mesh.scaling.setAll(scale);
      this.mesh.position.y = options.y + (this.highlighted ? 0.6 + Math.sin(time * 5) * 0.12 : 0);
    });
  }

  /** Bật / tắt nổi bật (khi rê chuột lên địa điểm). */
  setHighlighted(on: boolean) {
    if (on === this.highlighted) return;
    this.highlighted = on;
    this.material.emissiveColor.setAll(on ? 1 : 0.85);
    // Luôn vẽ trên cùng khi nổi bật (không bị cây, mái nhà che).
    this.mesh.renderingGroupId = on ? 1 : 0;
    this.draw();
  }

  /** Vẽ lại chữ (gọi khi font web vừa tải xong). */
  draw() {
    // Game đã bị hủy (rời trang) thì không còn canvas để vẽ.
    const ctx = this.texture.getContext() as CanvasRenderingContext2D | null;
    if (!ctx) return;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Tấm gỗ bo góc, viền sẫm, vệt sáng phía trên.
    const r = 34;
    const plank = (inset: number, color: string) => {
      ctx.beginPath();
      ctx.roundRect(inset, inset, WIDTH - inset * 2, HEIGHT - inset * 2 - 10, r);
      ctx.fillStyle = color;
      ctx.fill();
    };
    ctx.save();
    ctx.translate(0, 10);
    plank(6, "#5a2f0c"); // bóng / độ dày phía dưới
    ctx.restore();
    plank(6, this.highlighted ? "#7a4a0c" : "#4a2a10");
    plank(14, this.highlighted ? "#f2b632" : "#c98a4b");
    ctx.beginPath();
    ctx.roundRect(22, 20, WIDTH - 44, 50, 22);
    ctx.fillStyle = "rgba(255, 236, 200, 0.28)";
    ctx.fill();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = this.highlighted ? "#7a3f06" : "#4a2a10";
    ctx.font = `86px ${this.options.font}`;
    fitText(ctx, this.options.title, WIDTH - 80);
    ctx.fillText(this.options.title, WIDTH / 2, 92 + 5);
    ctx.fillStyle = "#fff4dc";
    ctx.fillText(this.options.title, WIDTH / 2, 92);

    ctx.font = `bold 44px ${this.options.subtitleFont}`;
    fitText(ctx, this.options.subtitle, WIDTH - 90);
    ctx.fillStyle = this.highlighted ? "#5a2f0c" : "#ffe7b0";
    ctx.fillText(this.options.subtitle, WIDTH / 2, 170);
    this.texture.update();
  }

  dispose() {
    this.mesh.material?.dispose(true, true);
    this.mesh.dispose();
  }
}

/** Thu nhỏ cỡ chữ cho vừa chiều rộng. */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const width = ctx.measureText(text).width;
  if (width <= maxWidth) return;
  const size = parseFloat(ctx.font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? "40");
  ctx.font = ctx.font.replace(/\d+(?:\.\d+)?px/, `${Math.floor((size * maxWidth) / width)}px`);
}
