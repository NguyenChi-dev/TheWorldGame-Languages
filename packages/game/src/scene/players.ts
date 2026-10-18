import { Scene, Vector3 } from "@babylonjs/core";
import type { CharacterAppearance, RemotePlayer } from "@lw/shared";
import type { WalkGrid } from "../maps/walk-grid";
import { CharacterModel, facingAngle, turnTowards } from "./character";
import { NameTag } from "./name-tag";

/** Tốc độ đi bình thường (đơn vị / giây). */
export const WALK_SPEED = 6.5;
const BASE_SPEED = WALK_SPEED;
/** Tăng / giảm tốc nhanh cỡ nào (càng lớn càng "nhạy"). */
const ACCELERATION = 20;

/** Một điểm trên mặt đất. */
export interface GroundPoint {
  x: number;
  z: number;
}

function deltaSeconds(scene: Scene) {
  return Math.min(scene.getEngine().getDeltaTime() / 1000, 0.1);
}

/**
 * Chuyển động mượt của một nhân vật: có vận tốc (tăng tốc / giảm tốc dần), quay người mượt theo
 * hướng đi, dáng đi theo tốc độ thật. Ba kiểu điều khiển:
 *   - steer(hướng): phím / cần điều khiển, đi tự do;
 *   - walk(điểm...): đi theo đường đã tìm sẵn, chậm dần khi tới đích;
 *   - chase(điểm): bám theo vị trí máy chủ báo (người chơi khác).
 * Có lưới đi lại thì không đi xuyên vật cản (đâm vào tường thì trượt dọc theo tường).
 */
export class CharacterWalker {
  readonly model: CharacterModel;
  private readonly velocity = Vector3.Zero();
  private waypoints: GroundPoint[] = [];
  private onArrive: (() => void) | null = null;
  private steering: GroundPoint | null = null;
  private chaseTarget: GroundPoint | null = null;

  constructor(
    scene: Scene,
    appearance: CharacterAppearance,
    name: string,
    start: GroundPoint,
    private readonly grid: WalkGrid | null = null,
    /** Tốc độ so với tốc độ đi chuẩn (dân làng đi thong thả hơn). */
    private readonly speedScale = 1,
  ) {
    this.model = new CharacterModel(scene, appearance, name);
    for (const mesh of this.model.parts) mesh.isPickable = false;
    this.model.root.position.set(start.x, 0, start.z);
  }

  get position(): GroundPoint {
    return { x: this.model.root.position.x, z: this.model.root.position.z };
  }

  get moving() {
    return Math.hypot(this.velocity.x, this.velocity.z) > 0.15;
  }

  /** Đang có đường đi chưa đi hết. */
  get hasPath() {
    return this.waypoints.length > 0;
  }

  /** Đi theo các điểm; tới điểm cuối thì gọi `onArrive` (bị hủy nếu có lệnh đi mới). */
  walk(points: GroundPoint[], onArrive?: () => void) {
    this.waypoints = [...points];
    this.onArrive = onArrive ?? null;
    this.steering = null;
  }

  /** Điều khiển trực tiếp: `direction` dài tối đa 1 (null = thả tay). Đang điều khiển thì hủy đường đi. */
  steer(direction: GroundPoint | null) {
    const active = direction !== null && Math.hypot(direction.x, direction.z) > 0.05;
    this.steering = active ? direction : null;
    if (active) {
      this.waypoints = [];
      this.onArrive = null;
    }
  }

  chase(target: GroundPoint) {
    this.chaseTarget = target;
  }

  /** Đặt ngay tại chỗ (người chơi khác ở quá xa, ví dụ vừa vào phòng). */
  teleport(p: GroundPoint) {
    this.model.root.position.set(p.x, 0, p.z);
    this.velocity.setAll(0);
  }

  face(dx: number, dz: number) {
    this.model.root.rotation.y = facingAngle(dx, dz);
  }

  step(dt: number) {
    const root = this.model.root;
    const desired = this.desiredVelocity();
    // Tăng / giảm tốc mượt (hàm mũ: không phụ thuộc số khung hình mỗi giây).
    const blend = 1 - Math.exp(-ACCELERATION * dt);
    this.velocity.x += (desired.x - this.velocity.x) * blend;
    this.velocity.z += (desired.z - this.velocity.z) * blend;
    let speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (speed < 0.02 && !desired.x && !desired.z) {
      this.velocity.setAll(0);
      speed = 0;
    }
    if (speed > 0) this.moveBy(this.velocity.x * dt, this.velocity.z * dt);
    if (speed > 0.2)
      root.rotation.y = turnTowards(root.rotation.y, facingAngle(this.velocity.x, this.velocity.z), dt * 18);
    this.model.update(dt, { speed: speed / (BASE_SPEED * this.speedScale) });
  }

  /** Vận tốc muốn đạt theo kiểu điều khiển hiện tại. */
  private desiredVelocity(): GroundPoint {
    const pos = this.position;
    const WALK_SPEED = BASE_SPEED * this.speedScale;
    if (this.steering) return { x: this.steering.x * WALK_SPEED, z: this.steering.z * WALK_SPEED };

    if (this.chaseTarget) {
      const dx = this.chaseTarget.x - pos.x;
      const dz = this.chaseTarget.z - pos.z;
      const distance = Math.hypot(dx, dz);
      if (distance > 12) {
        this.teleport(this.chaseTarget);
        return { x: 0, z: 0 };
      }
      if (distance < 0.08) return { x: 0, z: 0 };
      // Xa thì đi nhanh hơn chút để bắt kịp, gần thì chậm lại (không khựng).
      const speed = Math.min(WALK_SPEED * 1.25, distance * 5);
      return { x: (dx / distance) * speed, z: (dz / distance) * speed };
    }

    while (this.waypoints.length) {
      const target = this.waypoints[0];
      const dx = target.x - pos.x;
      const dz = target.z - pos.z;
      const distance = Math.hypot(dx, dz);
      const last = this.waypoints.length === 1;
      if (distance < (last ? 0.12 : 0.5)) {
        this.waypoints.shift();
        if (!this.waypoints.length && this.onArrive) {
          const done = this.onArrive;
          this.onArrive = null;
          done();
        }
        continue;
      }
      // Điểm cuối: chậm dần khi gần tới. Điểm giữa: giữ tốc độ, ôm cua mượt.
      const speed = last ? Math.min(WALK_SPEED, distance * 7) : WALK_SPEED;
      return { x: (dx / distance) * speed, z: (dz / distance) * speed };
    }
    return { x: 0, z: 0 };
  }

  /** Bước đi có kiểm tra vật cản: kẹt thì thử trượt theo từng trục (đi dọc tường). */
  private moveBy(dx: number, dz: number) {
    const p = this.model.root.position;
    if (!this.grid || this.grid.isWalkable(p.x + dx, p.z + dz)) {
      p.x += dx;
      p.z += dz;
    } else if (this.grid.isWalkable(p.x + dx, p.z)) {
      p.x += dx;
      this.velocity.z = 0;
    } else if (this.grid.isWalkable(p.x, p.z + dz)) {
      p.z += dz;
      this.velocity.x = 0;
    } else {
      this.velocity.setAll(0);
    }
  }

  dispose() {
    this.model.dispose();
  }
}

export interface PlayerLabels {
  /** Font cho bảng tên trên đầu (CSS font-family). */
  font: string;
}

/** Nhân vật của chính người chơi. */
export class LocalPlayer {
  private readonly walker: CharacterWalker;
  private readonly tag: NameTag | null = null;

  constructor(
    scene: Scene,
    appearance: CharacterAppearance,
    spawn: GroundPoint = { x: 0, z: 0 },
    label?: { name: string } & PlayerLabels,
    grid: WalkGrid | null = null,
  ) {
    this.walker = new CharacterWalker(scene, appearance, "local-player", spawn, grid);
    if (label) this.tag = new NameTag(scene, this.walker.model.root, label.name, label.font, true);
    scene.onBeforeRenderObservable.add(() => this.walker.step(deltaSeconds(scene)));
  }

  get position(): GroundPoint {
    return this.walker.position;
  }

  get moving() {
    return this.walker.moving;
  }

  walk(points: GroundPoint[], onArrive?: () => void) {
    this.walker.walk(points, onArrive);
  }

  steer(direction: GroundPoint | null) {
    this.walker.steer(direction);
  }

  /** Vẽ lại bảng tên (khi font web vừa tải xong). */
  redrawTag() {
    this.tag?.draw();
  }

  /** Quay mặt về hướng (dx, dz), ví dụ nhìn vào cửa khi tới nơi. */
  face(dx: number, dz: number) {
    this.walker.face(dx, dz);
  }
}

interface RemoteEntry {
  walker: CharacterWalker;
  tag: NameTag;
  appearanceKey: string;
}

const appearanceKey = (a: CharacterAppearance) => `${a.gender}/${a.hat}/${a.top}/${a.bottom}`;

/**
 * Người chơi khác trong phòng: nhân vật thật (đúng trang phục họ phối) kèm bảng tên.
 * Máy chủ báo vị trí của họ khoảng 10 lần / giây; ở đây nhân vật bám mượt theo vị trí đó.
 */
export class RemotePlayers {
  private readonly entries = new Map<string, RemoteEntry>();

  constructor(
    private readonly scene: Scene,
    private readonly labels: PlayerLabels,
  ) {
    scene.onBeforeRenderObservable.add(() => {
      const dt = deltaSeconds(scene);
      for (const entry of this.entries.values()) entry.walker.step(dt);
    });
  }

  update(players: RemotePlayer[]) {
    const seen = new Set<string>();

    for (const player of players) {
      seen.add(player.id);
      const target = { x: player.x, z: player.z };
      let entry = this.entries.get(player.id);
      // Đổi trang phục (hiếm): dựng lại nhân vật tại chỗ.
      if (entry && entry.appearanceKey !== appearanceKey(player.appearance)) {
        const at = entry.walker.position;
        this.remove(player.id);
        entry = this.create(player, at);
      }
      entry ??= this.create(player, target);
      entry.tag.setName(player.username);
      entry.walker.chase(target);
    }

    // Xóa những người đã rời phòng.
    for (const id of [...this.entries.keys()]) if (!seen.has(id)) this.remove(id);
  }

  private create(player: RemotePlayer, at: GroundPoint): RemoteEntry {
    const walker = new CharacterWalker(this.scene, player.appearance, `remote-${player.id}`, at);
    const tag = new NameTag(this.scene, walker.model.root, player.username, this.labels.font);
    const entry = { walker, tag, appearanceKey: appearanceKey(player.appearance) };
    this.entries.set(player.id, entry);
    return entry;
  }

  private remove(id: string) {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.tag.dispose();
    entry.walker.dispose();
    this.entries.delete(id);
  }

  /** Vẽ lại bảng tên (khi font web vừa tải xong). */
  redrawTags() {
    for (const entry of this.entries.values()) entry.tag.draw();
  }
}
