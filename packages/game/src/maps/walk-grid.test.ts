import { describe, expect, it } from "vitest";
import { WalkGrid, type Point } from "./walk-grid";

// Bản đồ 20 x 20 có một bức tường dọc ở x = 0, từ z = -6 tới z = 6.
function gridWithWall() {
  const grid = new WalkGrid(10);
  grid.block({ x: 0, z: 0, width: 1, depth: 12 });
  return grid;
}

const pathLength = (from: Point, path: Point[]) =>
  path.reduce(
    (sum, p, i) => sum + Math.hypot(p.x - (i ? path[i - 1] : from).x, p.z - (i ? path[i - 1] : from).z),
    0,
  );

describe("WalkGrid", () => {
  it("vật cản và mép bản đồ không đi được", () => {
    const grid = gridWithWall();
    expect(grid.isWalkable(0, 0)).toBe(false);
    expect(grid.isWalkable(-0.8, 0)).toBe(false); // nới thêm bán kính nhân vật
    expect(grid.isWalkable(3, 0)).toBe(true);
    expect(grid.isWalkable(11, 0)).toBe(false);
  });

  it("không có vật cản ở giữa: đi thẳng tới đích", () => {
    expect(gridWithWall().findPath({ x: 3, z: -2 }, { x: 7, z: 4 })).toEqual([{ x: 7, z: 4 }]);
  });

  it("có tường chắn: đi vòng qua đầu tường, không xuyên tường", () => {
    const grid = gridWithWall();
    const from = { x: -4, z: 0 };
    const path = grid.findPath(from, { x: 4, z: 0 });
    expect(path.length).toBeGreaterThan(1);
    expect(path[path.length - 1]).toEqual({ x: 4, z: 0 });
    // Mọi đoạn thẳng trên đường đều không vướng tường.
    path.forEach((p, i) => expect(grid.isClear(i ? path[i - 1] : from, p)).toBe(true));
    // Vòng qua đầu tường (z ≈ ±6.5): ngắn hơn nhiều so với đi lung tung.
    expect(pathLength(from, path)).toBeLessThan(18);
  });

  it("đích nằm trong vật cản: đi tới chỗ trống gần nhất", () => {
    const grid = gridWithWall();
    const path = grid.findPath({ x: -4, z: 0 }, { x: 0, z: 0 });
    const end = path[path.length - 1];
    expect(grid.isWalkable(end.x, end.z)).toBe(true);
    expect(Math.abs(end.x)).toBeLessThan(1.5);
  });

  it("bị nhốt kín: không có đường", () => {
    const grid = new WalkGrid(10);
    grid.block({ x: 0, z: 5, width: 20, depth: 0.5 });
    grid.block({ x: 0, z: -5, width: 20, depth: 0.5 });
    grid.block({ x: 5, z: 0, width: 0.5, depth: 20 });
    grid.block({ x: -5, z: 0, width: 0.5, depth: 20 });
    // Đứng trong hộp kín, đích ở ngoài hộp: đi tới chỗ gần đích nhất mà vẫn trong hộp? Không có đường thì [].
    expect(grid.findPath({ x: 0, z: 0 }, { x: 8, z: 8 })).toEqual([]);
  });
});
