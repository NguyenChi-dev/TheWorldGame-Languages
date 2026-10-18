import {
  Color3,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  TransformNode,
} from "@babylonjs/core";

const WIDTH = 512;
const HEIGHT = 112;

/**
 * Bảng tên nhỏ lơ lửng trên đầu nhân vật, luôn quay về phía camera.
 * `self`: bảng của chính mình (viền xanh lá) để dễ nhận ra giữa đám đông.
 */
export class NameTag {
  readonly mesh: Mesh;
  private readonly texture: DynamicTexture;

  constructor(
    scene: Scene,
    parent: TransformNode,
    private name: string,
    private readonly font: string,
    private readonly self = false,
  ) {
    this.texture = new DynamicTexture("name-tex", { width: WIDTH, height: HEIGHT }, scene, true);
    this.texture.hasAlpha = true;
    const mat = new StandardMaterial("name-mat", scene);
    mat.diffuseTexture = this.texture;
    mat.emissiveColor = Color3.White();
    mat.disableLighting = true;
    mat.useAlphaFromDiffuseTexture = true;
    mat.backFaceCulling = false;

    this.mesh = MeshBuilder.CreatePlane("name-tag", { width: 2.8, height: (2.8 * HEIGHT) / WIDTH }, scene);
    this.mesh.material = mat;
    this.mesh.parent = parent;
    this.mesh.position.y = 2.7;
    this.mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    this.mesh.isPickable = false;
    this.draw();
  }

  setName(name: string) {
    if (name === this.name) return;
    this.name = name;
    this.draw();
  }

  draw() {
    const ctx = this.texture.getContext() as CanvasRenderingContext2D | null;
    if (!ctx) return;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.font = `bold 52px ${this.font}`;
    const textWidth = Math.min(WIDTH - 40, ctx.measureText(this.name).width);
    const boxWidth = textWidth + 48;
    const x = (WIDTH - boxWidth) / 2;
    ctx.beginPath();
    ctx.roundRect(x, 12, boxWidth, HEIGHT - 24, 30);
    ctx.fillStyle = "rgba(30, 18, 8, 0.72)";
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = this.self ? "#4ade80" : "rgba(255, 228, 180, 0.55)";
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = this.self ? "#d9fbe5" : "#fff4dc";
    ctx.fillText(this.name, WIDTH / 2, HEIGHT / 2 + 2, WIDTH - 40);
    this.texture.update();
  }

  dispose() {
    this.mesh.material?.dispose(true, true);
    this.mesh.dispose();
  }
}
