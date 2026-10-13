import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from "@babylonjs/core";
import type { RemotePlayer } from "@lw/shared";
import type { TilePosition } from "./ground";

const MOVE_SPEED = 6; // đơn vị mỗi giây

/** Di chuyển mượt mesh tới vị trí đích thay vì nhảy tức thì. */
function stepTowards(mesh: Mesh, target: Vector3, deltaSeconds: number) {
  const distance = Vector3.Distance(mesh.position, target);
  if (distance < 0.001) return;
  const t = Math.min(1, (MOVE_SPEED * deltaSeconds) / distance);
  Vector3.LerpToRef(mesh.position, target, t, mesh.position);
}

function deltaSeconds(scene: Scene) {
  return scene.getEngine().getDeltaTime() / 1000;
}

/** Nhân vật của chính người chơi (tạm thời là một khối hộp vàng). */
export class LocalPlayer {
  private readonly mesh: Mesh;
  private readonly target = new Vector3(0, 0.5, 0);

  constructor(scene: Scene) {
    this.mesh = MeshBuilder.CreateBox("local-player", { size: 1 }, scene);
    this.mesh.position.copyFrom(this.target);
    this.mesh.isPickable = false;

    const material = new StandardMaterial("local-player-mat", scene);
    material.diffuseColor = new Color3(1, 0.8, 0.2);
    this.mesh.material = material;

    scene.onBeforeRenderObservable.add(() => stepTowards(this.mesh, this.target, deltaSeconds(scene)));
  }

  moveTo(tile: TilePosition) {
    this.target.set(tile.x, 0.5, tile.z);
  }
}

/** Đổi id người chơi thành một màu cố định, để mỗi người luôn có cùng một màu. */
function colorFromId(id: string): Color3 {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return Color3.FromHSV(hash % 360, 0.65, 0.9);
}

interface RemoteEntry {
  mesh: Mesh;
  target: Vector3;
}

/** Quản lý các khối hộp đại diện cho người chơi khác. */
export class RemotePlayers {
  private readonly entries = new Map<string, RemoteEntry>();

  constructor(private readonly scene: Scene) {
    scene.onBeforeRenderObservable.add(() => {
      const dt = deltaSeconds(scene);
      for (const entry of this.entries.values()) stepTowards(entry.mesh, entry.target, dt);
    });
  }

  update(players: RemotePlayer[]) {
    const seen = new Set<string>();

    for (const player of players) {
      seen.add(player.id);
      const entry = this.entries.get(player.id) ?? this.create(player);
      entry.target.set(player.x, 0.35, player.z);
    }

    // Xóa những người đã rời phòng.
    for (const [id, entry] of this.entries) {
      if (seen.has(id)) continue;
      entry.mesh.material?.dispose();
      entry.mesh.dispose();
      this.entries.delete(id);
    }
  }

  private create(player: RemotePlayer): RemoteEntry {
    const mesh = MeshBuilder.CreateBox(`remote-${player.id}`, { size: 0.7 }, this.scene);
    mesh.isPickable = false;
    mesh.position.set(player.x, 0.35, player.z);

    const material = new StandardMaterial(`remote-${player.id}-mat`, this.scene);
    material.diffuseColor = colorFromId(player.id);
    mesh.material = material;

    const entry = { mesh, target: mesh.position.clone() };
    this.entries.set(player.id, entry);
    return entry;
  }
}
