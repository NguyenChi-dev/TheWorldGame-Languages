import {
  Color3,
  Color4,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  ParticleSystem,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import { randomAppearance } from "@lw/shared";
import type { WalkGrid } from "../maps/walk-grid";
import { CharacterWalker } from "./players";

/** Vị trí các hiệu ứng trên bản đồ. */
export interface LifeSpots {
  /** Đỉnh đài phun nước (tia nước bắn lên rồi rơi xuống). */
  fountain?: Vector3;
  /** Chân thác nước (bụi nước bốc lên). */
  waterfall?: Vector3;
  /** Miệng ống khói (khói bay lên). */
  chimneys?: Vector3[];
  /** Hơi nóng bốc lên (tách cà phê). */
  steam?: Vector3[];
}

/** Hạt tròn mềm (vẽ bằng canvas) dùng chung cho mọi hiệu ứng hạt. */
function softDot(scene: Scene) {
  const texture = new DynamicTexture("particle-dot", { width: 64, height: 64 }, scene, false);
  const ctx = texture.getContext() as CanvasRenderingContext2D;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.45, "rgba(255,255,255,0.65)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  texture.hasAlpha = true;
  texture.update();
  return texture;
}

function particles(
  scene: Scene,
  texture: DynamicTexture,
  at: Vector3,
  setup: (ps: ParticleSystem) => void,
  capacity: number,
) {
  const ps = new ParticleSystem("particle", capacity, scene);
  ps.particleTexture = texture;
  ps.emitter = at.clone();
  ps.blendMode = ParticleSystem.BLENDMODE_STANDARD;
  setup(ps);
  ps.start();
  return ps;
}

/** Đám mây low-poly: vài khối cầu trắng dính vào nhau, trôi chậm. */
function cloud(scene: Scene, material: StandardMaterial, seed: number) {
  const parts: Mesh[] = [];
  const count = 4 + (seed % 3);
  for (let i = 0; i < count; i++) {
    const ball = MeshBuilder.CreateIcoSphere(
      "cloud",
      { radius: 2 + ((seed * 7 + i * 3) % 5) * 0.45, subdivisions: 1, flat: true },
      scene,
    );
    ball.position.set(i * 2.4 - count, ((seed + i) % 2) * 0.9, ((seed * 3 + i) % 3) - 1);
    ball.scaling.y = 0.7;
    parts.push(ball);
  }
  const mesh = Mesh.MergeMeshes(parts, true)!;
  mesh.name = "cloud";
  mesh.material = material;
  mesh.isPickable = false;
  return mesh;
}

/**
 * Sự sống cho bản đồ: mây trôi, đàn chim lượn, tia nước đài phun, bụi nước thác, khói ống khói,
 * hơi nóng tách cà phê, và dân làng đi dạo quanh thị trấn (chỉ hiện trên máy mình, không đồng bộ).
 */
export function createAmbientLife(
  scene: Scene,
  options: { spots: LifeSpots; grid: WalkGrid | null; area: number; villagers: number },
) {
  const dot = softDot(scene);
  const { spots, area } = options;

  // Mây.
  const cloudMaterial = new StandardMaterial("cloud-mat", scene);
  cloudMaterial.diffuseColor = Color3.White();
  cloudMaterial.emissiveColor = new Color3(0.78, 0.82, 0.88);
  cloudMaterial.specularColor = Color3.Black();
  cloudMaterial.alpha = 0.92;
  // Mây lơ lửng phía chân trời (sau đảo, phía bắc) để luôn thấy trên nền trời, không che mặt đất.
  const clouds = Array.from({ length: 10 }, (_, i) => {
    const mesh = cloud(scene, cloudMaterial, i + 1);
    mesh.scaling.setAll(1.6 + (i % 3) * 0.4);
    mesh.position.set(-area * 1.6 + ((i * 41) % (area * 3.2)), 16 + (i % 4) * 4, area + 26 + ((i * 17) % 40));
    return { mesh, speed: 0.6 + (i % 4) * 0.25 };
  });

  // Chim: thân + 2 cánh vỗ, bay vòng.
  const birdMaterial = new StandardMaterial("bird-mat", scene);
  birdMaterial.diffuseColor = Color3.FromHexString("#3b3f4a");
  birdMaterial.specularColor = Color3.Black();
  const birds = Array.from({ length: 6 }, (_, i) => {
    const root = new TransformNode("bird", scene);
    const wings = [-1, 1].map((side) => {
      const wing = MeshBuilder.CreateBox("bird", { width: 0.9, height: 0.05, depth: 0.32 }, scene);
      wing.setPivotPoint(new Vector3(-side * 0.45, 0, 0));
      wing.position.x = side * 0.45;
      wing.parent = root;
      wing.material = birdMaterial;
      wing.isPickable = false;
      return { wing, side };
    });
    return {
      root,
      wings,
      radius: 14 + i * 4,
      height: 13 + (i % 3) * 2.5,
      speed: 0.22 + (i % 3) * 0.05,
      phase: i * 1.7,
    };
  });

  // Tia nước đài phun.
  if (spots.fountain)
    particles(
      scene,
      dot,
      spots.fountain,
      (ps) => {
        ps.minEmitBox = new Vector3(-0.15, 0, -0.15);
        ps.maxEmitBox = new Vector3(0.15, 0, 0.15);
        ps.direction1 = new Vector3(-1, 5, -1);
        ps.direction2 = new Vector3(1, 6.5, 1);
        ps.gravity = new Vector3(0, -12, 0);
        ps.minSize = 0.12;
        ps.maxSize = 0.3;
        ps.minLifeTime = 0.6;
        ps.maxLifeTime = 0.9;
        ps.emitRate = 90;
        ps.minEmitPower = 0.8;
        ps.maxEmitPower = 1.1;
        ps.color1 = new Color4(0.85, 0.95, 1, 0.9);
        ps.color2 = new Color4(0.6, 0.85, 1, 0.8);
        ps.colorDead = new Color4(0.7, 0.9, 1, 0);
      },
      260,
    );

  // Bụi nước chân thác.
  if (spots.waterfall)
    particles(
      scene,
      dot,
      spots.waterfall,
      (ps) => {
        ps.minEmitBox = new Vector3(-2, 0, -0.4);
        ps.maxEmitBox = new Vector3(2, 0.5, 0.4);
        ps.direction1 = new Vector3(-0.4, 1, -0.8);
        ps.direction2 = new Vector3(0.4, 1.6, -0.2);
        ps.gravity = new Vector3(0, -0.6, 0);
        ps.minSize = 0.6;
        ps.maxSize = 1.4;
        ps.minLifeTime = 1.2;
        ps.maxLifeTime = 2;
        ps.emitRate = 40;
        ps.color1 = new Color4(1, 1, 1, 0.45);
        ps.color2 = new Color4(0.85, 0.95, 1, 0.35);
        ps.colorDead = new Color4(1, 1, 1, 0);
      },
      120,
    );

  // Khói ống khói, hơi nóng tách cà phê.
  const smoke = (at: Vector3, light: boolean) =>
    particles(
      scene,
      dot,
      at,
      (ps) => {
        ps.minEmitBox = new Vector3(-0.1, 0, -0.1);
        ps.maxEmitBox = new Vector3(0.1, 0, 0.1);
        ps.direction1 = new Vector3(0.2, 1, -0.1);
        ps.direction2 = new Vector3(0.6, 1.4, 0.2);
        ps.minSize = light ? 0.25 : 0.5;
        ps.maxSize = light ? 0.5 : 1.1;
        ps.addSizeGradient(0, 0.4);
        ps.addSizeGradient(1, light ? 1.4 : 2.4);
        ps.minLifeTime = 1.8;
        ps.maxLifeTime = 3;
        ps.emitRate = light ? 6 : 8;
        ps.minEmitPower = 0.5;
        ps.maxEmitPower = 0.8;
        ps.color1 = light ? new Color4(1, 1, 1, 0.55) : new Color4(0.86, 0.86, 0.88, 0.55);
        ps.color2 = light ? new Color4(1, 1, 1, 0.4) : new Color4(0.75, 0.75, 0.78, 0.45);
        ps.colorDead = new Color4(0.9, 0.9, 0.92, 0);
      },
      40,
    );
  for (const at of spots.chimneys ?? []) smoke(at, false);
  for (const at of spots.steam ?? []) smoke(at, true);

  // Dân làng đi dạo: chọn chỗ ngẫu nhiên gần nhà, đi tới, đứng nghỉ một lúc, rồi đi tiếp.
  const villagers: { walker: CharacterWalker; home: Vector3; rest: number }[] = [];
  if (options.grid) {
    const grid = options.grid;
    let tries = 0;
    while (villagers.length < options.villagers && tries++ < 400) {
      const x = (Math.random() - 0.5) * area * 1.6;
      const z = (Math.random() - 0.5) * area * 1.6;
      if (!grid.isWalkable(x, z)) continue;
      const walker = new CharacterWalker(
        scene,
        randomAppearance(Math.random() < 0.5 ? "female" : "male"),
        `villager-${villagers.length}`,
        { x, z },
        grid,
        0.45,
      );
      villagers.push({ walker, home: new Vector3(x, 0, z), rest: Math.random() * 4 });
    }
  }

  let time = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.1);
    time += dt;
    for (const c of clouds) {
      c.mesh.position.x += c.speed * dt;
      if (c.mesh.position.x > area * 1.7) c.mesh.position.x = -area * 1.7;
    }
    for (const b of birds) {
      const a = time * b.speed + b.phase;
      b.root.position.set(
        Math.cos(a) * b.radius,
        b.height + Math.sin(time * 0.7 + b.phase) * 1.2,
        Math.sin(a) * b.radius + 6,
      );
      b.root.rotation.y = -a;
      const flap = Math.sin(time * 9 + b.phase) * 0.55;
      for (const { wing, side } of b.wings) wing.rotation.z = side * flap;
    }
    for (const v of villagers) {
      v.walker.step(dt);
      if (v.walker.moving || v.walker.hasPath) continue;
      v.rest -= dt;
      if (v.rest > 0) continue;
      v.rest = 2 + Math.random() * 5;
      const target = {
        x: v.home.x + (Math.random() - 0.5) * 24,
        z: v.home.z + (Math.random() - 0.5) * 24,
      };
      const grid = options.grid!;
      if (!grid.isWalkable(target.x, target.z)) continue;
      const path = grid.findPath(v.walker.position, target);
      if (path.length) v.walker.walk(path);
    }
  });
}
