// Nhập từ gốc "@babylonjs/core" để chắc chắn mọi tính năng phụ (như chọn vật bằng tia) đã được nạp.
// Sau này nếu cần giảm dung lượng, có thể đổi sang nhập từng file như "@babylonjs/core/scene".
import { Engine, PointerEventTypes, Scene } from "@babylonjs/core";
import { registerBuiltInLoaders } from "@babylonjs/loaders/dynamic";
import { DEFAULT_APPEARANCE, type CharacterAppearance, type RemotePlayer } from "@lw/shared";
import { createCamera, createLights, fitCameraToScreen } from "./scene/environment";
import { createGroundGrid, pickTile, type TilePosition } from "./scene/ground";
import { LocalPlayer, RemotePlayers } from "./scene/players";

export type { TilePosition };

export interface StartGameOptions {
  /** Ngoại hình nhân vật người chơi đã phối. Mặc định DEFAULT_APPEARANCE. */
  appearance?: CharacterAppearance;
  /** Gọi khi người chơi chạm (hoặc bấm chuột) vào một ô đất. */
  onTileTap?: (tile: TilePosition) => void;
  /** Tỉ lệ điểm ảnh tối đa khi vẽ. Màn hình nét cao (3x) sẽ chỉ vẽ ở mức này. Mặc định 2. */
  maxPixelRatio?: number;
}

export interface GameHandle {
  /** Dừng vẽ và giải phóng toàn bộ tài nguyên. Gọi khi rời trang. */
  dispose: () => void;
  /** Vẽ những người chơi khác, mỗi người là một khối hộp màu riêng. */
  setRemotePlayers: (players: RemotePlayer[]) => void;
}

let loadersRegistered = false;

/** Đăng ký bộ nạp glTF (.glb/.gltf) và các định dạng khác. Mã bộ nạp chỉ tải về khi thật sự dùng. */
function ensureLoadersRegistered() {
  if (loadersRegistered) return;
  registerBuiltInLoaders();
  loadersRegistered = true;
}

export function startGame(canvas: HTMLCanvasElement, options: StartGameOptions = {}): GameHandle {
  ensureLoadersRegistered();

  const maxPixelRatio = options.maxPixelRatio ?? 2;
  // Tham số cuối adaptToDeviceRatio = false: ta tự đặt độ phân giải ở applyResolution()
  // để màn hình nét cao (điện thoại 3x) không phải vẽ quá nhiều điểm ảnh.
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true }, false);

  const applyResolution = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
    engine.setHardwareScalingLevel(1 / ratio);
    engine.resize();
  };
  applyResolution();

  const scene = new Scene(engine);
  createLights(scene);
  const camera = createCamera(scene);
  // Mỗi lần engine đổi kích thước (xoay điện thoại...), chỉnh lại góc nhìn cho vừa màn hình.
  engine.onResizeObservable.add(() => fitCameraToScreen(camera));
  createGroundGrid(scene);

  const localPlayer = new LocalPlayer(scene, options.appearance ?? DEFAULT_APPEARANCE);
  const remotePlayers = new RemotePlayers(scene);

  // POINTERTAP chỉ xảy ra khi chạm/bấm nhanh, không xảy ra khi đang kéo xoay camera.
  scene.onPointerObservable.add((pointerInfo) => {
    if (pointerInfo.type !== PointerEventTypes.POINTERTAP) return;
    const tile = pickTile(scene);
    if (!tile) return;
    localPlayer.moveTo(tile);
    options.onTileTap?.(tile);
  });

  engine.runRenderLoop(() => scene.render());

  // Đổi kích thước khi cửa sổ đổi (xoay điện thoại, kéo cửa sổ) hoặc khi khung chứa canvas đổi.
  window.addEventListener("resize", applyResolution);
  const resizeObserver = new ResizeObserver(() => engine.resize());
  resizeObserver.observe(canvas);

  return {
    setRemotePlayers: (players) => remotePlayers.update(players),
    dispose: () => {
      window.removeEventListener("resize", applyResolution);
      resizeObserver.disconnect();
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
    },
  };
}
