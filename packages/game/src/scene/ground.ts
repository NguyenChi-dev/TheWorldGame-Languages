import { Color3, MeshBuilder, Scene, StandardMaterial } from "@babylonjs/core";
import { CELL_SIZE, GRID_SIZE } from "@lw/shared";

/** Tâm của một ô đất trong thế giới 3D. */
export interface TilePosition {
  x: number;
  z: number;
}

interface TileMetadata {
  tile: TilePosition;
}

function isTileMetadata(value: unknown): value is TileMetadata {
  return typeof value === "object" && value !== null && "tile" in value;
}

/** Mặt đất là lưới GRID_SIZE x GRID_SIZE ô, mỗi ô là một khối dẹt để trông low-poly. */
export function createGroundGrid(scene: Scene) {
  const light = new StandardMaterial("tile-light", scene);
  light.diffuseColor = new Color3(0.49, 0.75, 0.36);
  light.specularColor = Color3.Black();

  const dark = new StandardMaterial("tile-dark", scene);
  dark.diffuseColor = new Color3(0.42, 0.67, 0.31);
  dark.specularColor = Color3.Black();

  const offset = ((GRID_SIZE - 1) * CELL_SIZE) / 2;

  for (let col = 0; col < GRID_SIZE; col++) {
    for (let row = 0; row < GRID_SIZE; row++) {
      const x = col * CELL_SIZE - offset;
      const z = row * CELL_SIZE - offset;
      const tile = MeshBuilder.CreateBox(
        `tile-${col}-${row}`,
        { width: CELL_SIZE * 0.96, depth: CELL_SIZE * 0.96, height: 0.3 },
        scene,
      );
      tile.position.set(x, -0.15, z);
      tile.material = (col + row) % 2 === 0 ? light : dark;
      tile.metadata = { tile: { x, z } } satisfies TileMetadata;
      tile.freezeWorldMatrix(); // ô đất đứng yên, không cần tính lại vị trí mỗi khung hình
    }
  }
}

/** Tìm ô đất nằm dưới vị trí con trỏ/ngón tay gần nhất. */
export function pickTile(scene: Scene): TilePosition | null {
  const pick = scene.pick(scene.pointerX, scene.pointerY, (mesh) => isTileMetadata(mesh.metadata));
  const metadata: unknown = pick.pickedMesh?.metadata;
  return pick.hit && isTileMetadata(metadata) ? metadata.tile : null;
}
