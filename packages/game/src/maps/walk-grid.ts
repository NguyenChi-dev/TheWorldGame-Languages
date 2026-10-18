/**
 * Lưới đi lại của bản đồ: chia mặt đất thành ô vuông nhỏ, đánh dấu ô nào có vật cản (nhà, cây, hồ...).
 * Dùng để:
 *   - kiểm tra va chạm khi điều khiển bằng phím / cần điều khiển (đi sát tường thì trượt theo tường);
 *   - tìm đường (A*) khi bấm tới một điểm bất kỳ: đi tự do trên cỏ, vòng qua vật cản, không chỉ theo đường phố.
 * Không phụ thuộc Babylon, chỉ là hình học 2D trên mặt phẳng x, z.
 */

export interface Point {
  x: number;
  z: number;
}

/** Hình chữ nhật thẳng trục: tâm (x, z), rộng theo x, sâu theo z. */
export interface Rect {
  x: number;
  z: number;
  width: number;
  depth: number;
}

/** Bán kính nhân vật: vật cản được nới thêm chừng này để nhân vật không chạm tường. */
const BODY_RADIUS = 0.35;
const SQRT2 = Math.SQRT2;

export class WalkGrid {
  readonly size: number;
  private readonly blocked: Uint8Array;

  constructor(
    /** Bản đồ trải từ -halfExtent tới halfExtent theo cả x và z. */
    readonly halfExtent: number,
    readonly cell = 0.5,
  ) {
    this.size = Math.ceil((halfExtent * 2) / cell);
    this.blocked = new Uint8Array(this.size * this.size);
  }

  /** Đánh dấu vật cản (tự nới thêm bán kính nhân vật). */
  block(rect: Rect) {
    const halfW = rect.width / 2 + BODY_RADIUS;
    const halfD = rect.depth / 2 + BODY_RADIUS;
    const [c0, r0] = this.cellOf(rect.x - halfW, rect.z - halfD);
    const [c1, r1] = this.cellOf(rect.x + halfW, rect.z + halfD);
    for (let r = Math.max(0, r0); r <= Math.min(this.size - 1, r1); r++)
      for (let c = Math.max(0, c0); c <= Math.min(this.size - 1, c1); c++)
        this.blocked[r * this.size + c] = 1;
  }

  /** Đi được tại điểm (x, z)? Ngoài bản đồ coi như không đi được. */
  isWalkable(x: number, z: number): boolean {
    const [c, r] = this.cellOf(x, z);
    return this.walkableCell(c, r);
  }

  /** Đường đi thẳng a → b không vướng vật cản? */
  isClear(a: Point, b: Point): boolean {
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.max(1, Math.ceil(length / (this.cell * 0.5)));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (!this.isWalkable(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false;
    }
    return true;
  }

  /** Điểm đi được gần `p` nhất (chính `p` nếu đã đi được). */
  nearestWalkable(p: Point): Point {
    if (this.isWalkable(p.x, p.z)) return p;
    const [c0, r0] = this.cellOf(p.x, p.z);
    for (let radius = 1; radius < this.size; radius++) {
      let best: Point | null = null;
      let bestDistance = Infinity;
      for (let dr = -radius; dr <= radius; dr++)
        for (let dc = -radius; dc <= radius; dc++) {
          if (Math.max(Math.abs(dr), Math.abs(dc)) !== radius) continue;
          if (!this.walkableCell(c0 + dc, r0 + dr)) continue;
          const point = this.centerOf(c0 + dc, r0 + dr);
          const d = Math.hypot(point.x - p.x, point.z - p.z);
          if (d < bestDistance) {
            bestDistance = d;
            best = point;
          }
        }
      if (best) return best;
    }
    return p;
  }

  /**
   * Đường đi từ `from` tới `to` (A* 8 hướng, không cắt góc tường), đã làm mượt: chỉ giữ các điểm
   * rẽ thật sự. Điểm đích nằm trong vật cản thì đi tới chỗ trống gần nhất. Không có đường: [].
   */
  findPath(from: Point, to: Point): Point[] {
    const start = this.nearestWalkable(from);
    const goal = this.nearestWalkable(to);
    if (this.isClear(start, goal)) return [goal];

    const [sc, sr] = this.cellOf(start.x, start.z);
    const [gc, gr] = this.cellOf(goal.x, goal.z);
    const startIndex = sr * this.size + sc;
    const goalIndex = gr * this.size + gc;
    const g = new Float32Array(this.size * this.size).fill(Infinity);
    const came = new Int32Array(this.size * this.size).fill(-1);
    const closed = new Uint8Array(this.size * this.size);
    const heap = new MinHeap();
    const h = (c: number, r: number) => {
      const dx = Math.abs(c - gc);
      const dy = Math.abs(r - gr);
      return Math.max(dx, dy) + (SQRT2 - 1) * Math.min(dx, dy);
    };
    g[startIndex] = 0;
    heap.push(startIndex, h(sc, sr));

    let found = false;
    while (heap.length) {
      const current = heap.pop();
      if (current === goalIndex) {
        found = true;
        break;
      }
      if (closed[current]) continue;
      closed[current] = 1;
      const c = current % this.size;
      const r = (current - c) / this.size;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const nc = c + dc;
          const nr = r + dr;
          if (!this.walkableCell(nc, nr)) continue;
          // Đi chéo chỉ khi 2 ô bên cạnh đều trống (không lách qua góc tường).
          if (dr && dc && (!this.walkableCell(c + dc, r) || !this.walkableCell(c, r + dr))) continue;
          const next = nr * this.size + nc;
          if (closed[next]) continue;
          const cost = g[current] + (dr && dc ? SQRT2 : 1);
          if (cost < g[next]) {
            g[next] = cost;
            came[next] = current;
            heap.push(next, cost + h(nc, nr));
          }
        }
    }
    if (!found) return [];

    const cells: Point[] = [];
    for (let i = goalIndex; i !== startIndex && i !== -1; i = came[i]) {
      const c = i % this.size;
      cells.unshift(this.centerOf(c, (i - c) / this.size));
    }
    cells[cells.length - 1] = goal;
    return this.smooth(start, cells);
  }

  /** Bỏ các điểm trung gian thấy được nhau (đi thẳng được thì đi thẳng). */
  private smooth(start: Point, cells: Point[]): Point[] {
    const result: Point[] = [];
    let anchor = start;
    let i = 0;
    while (i < cells.length) {
      let j = cells.length - 1;
      while (j > i && !this.isClear(anchor, cells[j])) j--;
      result.push(cells[j]);
      anchor = cells[j];
      i = j + 1;
    }
    return result;
  }

  private cellOf(x: number, z: number): [number, number] {
    return [Math.floor((x + this.halfExtent) / this.cell), Math.floor((z + this.halfExtent) / this.cell)];
  }

  private centerOf(c: number, r: number): Point {
    return { x: (c + 0.5) * this.cell - this.halfExtent, z: (r + 0.5) * this.cell - this.halfExtent };
  }

  private walkableCell(c: number, r: number): boolean {
    return c >= 0 && r >= 0 && c < this.size && r < this.size && !this.blocked[r * this.size + c];
  }
}

/** Hàng đợi ưu tiên nhỏ nhất (dùng cho A*). */
class MinHeap {
  private readonly items: number[] = [];
  private readonly scores: number[] = [];

  get length() {
    return this.items.length;
  }

  push(item: number, score: number) {
    this.items.push(item);
    this.scores.push(score);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.scores[parent] <= this.scores[i]) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  pop(): number {
    const top = this.items[0];
    const lastItem = this.items.pop()!;
    const lastScore = this.scores.pop()!;
    if (this.items.length) {
      this.items[0] = lastItem;
      this.scores[0] = lastScore;
      let i = 0;
      while (true) {
        const l = i * 2 + 1;
        const r = l + 1;
        let smallest = i;
        if (l < this.items.length && this.scores[l] < this.scores[smallest]) smallest = l;
        if (r < this.items.length && this.scores[r] < this.scores[smallest]) smallest = r;
        if (smallest === i) break;
        this.swap(i, smallest);
        i = smallest;
      }
    }
    return top;
  }

  private swap(a: number, b: number) {
    [this.items[a], this.items[b]] = [this.items[b], this.items[a]];
    [this.scores[a], this.scores[b]] = [this.scores[b], this.scores[a]];
  }
}
