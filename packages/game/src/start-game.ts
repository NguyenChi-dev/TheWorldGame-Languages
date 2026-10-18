// Nhập từ gốc "@babylonjs/core" để chắc chắn mọi tính năng phụ (như chọn vật bằng tia) đã được nạp.
// Sau này nếu cần giảm dung lượng, có thể đổi sang nhập từng file như "@babylonjs/core/scene".
import { Engine, PointerEventTypes, Scene, Vector3 } from "@babylonjs/core";
import { registerBuiltInLoaders } from "@babylonjs/loaders/dynamic";
import {
  DEFAULT_APPEARANCE,
  type CharacterAppearance,
  type MapKey,
  type RemotePlayer,
  type TownPlaceKey,
} from "@lw/shared";
import { CELL_SIZE, GRID_SIZE } from "@lw/shared";
import { TOWN_HALF_EXTENT, buildEnglishTown, type TownMap } from "./maps/english-town";
import { WalkGrid } from "./maps/walk-grid";
import { createCamera, createLights, fitCameraToScreen, followCamera } from "./scene/environment";
import { createGroundGrid, pickTile, type TilePosition } from "./scene/ground";
import { createAmbientLife } from "./scene/ambient-life";
import { createAtmosphere, type GraphicsQuality } from "./scene/atmosphere";
import { ClickMarker } from "./scene/click-marker";
import { LocalPlayer, RemotePlayers, type GroundPoint } from "./scene/players";

export type { TilePosition };

export interface StartGameOptions {
  /** Ngoại hình nhân vật người chơi đã phối. Mặc định DEFAULT_APPEARANCE. */
  appearance?: CharacterAppearance;
  /** Bản đồ của vùng đất. Không có: bãi cỏ lưới 6x6 mặc định. */
  map?: MapKey | null;
  /** Font cho biển tên địa điểm và bảng tên người chơi (CSS font-family), ví dụ font của trang web. */
  fonts?: { title: string; subtitle: string };
  /** Tên nhân vật hiện trên đầu. */
  playerName?: string;
  /** Vị trí nhân vật thay đổi (gọi tối đa ~10 lần / giây khi đang đi) để gửi cho người chơi khác. */
  onMove?: (position: TilePosition) => void;
  /** Nhân vật vừa tới một địa điểm trên bản đồ. */
  onPlaceArrive?: (place: TownPlaceKey) => void;
  /** Nhân vật rời địa điểm đang đứng. */
  onPlaceLeave?: () => void;
  /** Con trỏ chuột vừa rê lên một địa điểm (null: rời khỏi địa điểm). */
  onPlaceHover?: (place: TownPlaceKey | null) => void;
  /**
   * Chất lượng đồ họa trên bản đồ (bóng đổ, hậu kỳ màu). Mặc định: "low" cho màn hình cảm ứng
   * (điện thoại / máy tính bảng), "high" cho máy tính.
   */
  quality?: GraphicsQuality;
  /** Tỉ lệ điểm ảnh tối đa khi vẽ. Màn hình nét cao (3x) sẽ chỉ vẽ ở mức này. Mặc định 2. */
  maxPixelRatio?: number;
}

export interface GameHandle {
  /** Dừng vẽ và giải phóng toàn bộ tài nguyên. Gọi khi rời trang. */
  dispose: () => void;
  /** Vẽ những người chơi khác (đúng trang phục, có bảng tên). */
  setRemotePlayers: (players: RemotePlayer[]) => void;
  /**
   * Cần điều khiển trên màn hình: x sang phải, y lên trên (theo màn hình), mỗi trục -1..1.
   * (0, 0) = thả tay. Bàn phím (WASD / mũi tên) được game tự nghe.
   */
  setMoveInput: (x: number, y: number) => void;
  /** Đi tới một địa điểm trên bản đồ (tự tìm đường vòng qua nhà cửa). Không có bản đồ thì bỏ qua. */
  goToPlace: (place: TownPlaceKey) => void;
  /** Vẽ lại chữ trên biển tên (gọi khi font web vừa tải xong). */
  redrawLabels: () => void;
  /** Điểm xuất hiện của nhân vật (gửi cho máy chủ realtime khi vào phòng). */
  spawn: { x: number; z: number };
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
  const lights = createLights(scene);
  const camera = createCamera(scene);
  // Mỗi lần engine đổi kích thước (xoay điện thoại...), chỉnh lại góc nhìn cho vừa màn hình.
  engine.onResizeObservable.add(() => fitCameraToScreen(camera));
  const fonts = options.fonts ?? { title: "Arial Black, sans-serif", subtitle: "Arial, sans-serif" };
  const town: TownMap | null = options.map === "english-town" ? buildEnglishTown(scene, fonts) : null;
  if (!town) createGroundGrid(scene);

  // Lưới đi lại: bản đồ thị trấn có vật cản; bãi cỏ mặc định thì chỉ giới hạn trong mép lưới.
  const grid = town?.grid ?? new WalkGrid((GRID_SIZE * CELL_SIZE) / 2 - 0.3);
  const spawn = town?.spawn ?? { x: 0, z: 0 };
  const localPlayer = new LocalPlayer(
    scene,
    options.appearance ?? DEFAULT_APPEARANCE,
    spawn,
    options.playerName ? { name: options.playerName, font: fonts.subtitle } : undefined,
    grid,
  );
  const remotePlayers = new RemotePlayers(scene, { font: fonts.subtitle });
  if (town) {
    followCamera(camera, () => localPlayer.position);
    // Không khí tự nhiên: trời, sương xa, nắng + bóng đổ, hậu kỳ màu; mây, chim, khói, dân làng.
    const quality = options.quality ?? (window.matchMedia?.("(pointer: coarse)").matches ? "low" : "high");
    const atmosphere = createAtmosphere(scene, camera, lights, () => localPlayer.position, quality);
    // Máy vẽ chậm (dưới ~30 khung hình / giây sau khi đã chạy ổn định): tự giảm hiệu ứng.
    let level = 0;
    const check = window.setInterval(() => {
      const fps = engine.getFps();
      if (level < 2 && fps < 22) atmosphere.degrade((level = 2));
      else if (level < 1 && fps < 32) atmosphere.degrade((level = 1));
      else if (level >= 2) window.clearInterval(check);
    }, 4000);
    scene.onDisposeObservable.add(() => window.clearInterval(check));
    createAmbientLife(scene, {
      spots: town.life,
      grid,
      area: TOWN_HALF_EXTENT,
      villagers: quality === "high" ? 12 : 6,
    });
  }

  // ---------------------------------------------------------------------------
  // Điều khiển: phím WASD / mũi tên, cần điều khiển trên màn hình, hoặc bấm vào điểm muốn tới.
  // Hướng tính theo màn hình (lên = xa camera), vì góc camera cố định.
  // ---------------------------------------------------------------------------
  const keys = new Set<string>();
  const KEY_DIRECTIONS: Record<string, [number, number]> = {
    KeyW: [0, 1],
    ArrowUp: [0, 1],
    KeyS: [0, -1],
    ArrowDown: [0, -1],
    KeyA: [-1, 0],
    ArrowLeft: [-1, 0],
    KeyD: [1, 0],
    ArrowRight: [1, 0],
  };
  const isTyping = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
  const onKeyDown = (event: KeyboardEvent) => {
    if (!(event.code in KEY_DIRECTIONS) || isTyping(event.target)) return;
    keys.add(event.code);
    event.preventDefault(); // mũi tên không cuộn trang
  };
  const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
  const clearKeys = () => keys.clear();
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clearKeys);

  let stick = { x: 0, y: 0 };
  /** Hướng điều khiển trên mặt đất (null = không điều khiển). */
  const steering = (): GroundPoint | null => {
    let ix = stick.x;
    let iy = stick.y;
    if (!ix && !iy)
      for (const code of keys) {
        ix += KEY_DIRECTIONS[code][0];
        iy += KEY_DIRECTIONS[code][1];
      }
    const length = Math.hypot(ix, iy);
    if (length < 0.05) return null;
    const scale = Math.min(1, length) / length;
    // Trục màn hình → mặt đất: phải / trước của camera chiếu xuống mặt phẳng ngang.
    const right = camera.getDirection(Vector3.Right());
    const forward = camera.getDirection(Vector3.Forward());
    right.y = 0;
    forward.y = 0;
    right.normalize();
    forward.normalize();
    return {
      x: (right.x * ix + forward.x * iy) * scale,
      z: (right.z * ix + forward.z * iy) * scale,
    };
  };

  /** Địa điểm đang đứng: tới gần chỗ đứng (và dừng lại) là "đã tới", đi xa là "rời đi". */
  let currentPlace: TownPlaceKey | null = null;
  const ARRIVE_DISTANCE = 1.8;
  const LEAVE_DISTANCE = 3.2;
  const updatePlace = () => {
    if (!town) return;
    const pos = localPlayer.position;
    const distanceTo = (spot: GroundPoint) => Math.hypot(spot.x - pos.x, spot.z - pos.z);
    if (currentPlace) {
      const place = town.places.find((item) => item.key === currentPlace)!;
      if (distanceTo(place.spot) <= LEAVE_DISTANCE) return;
      currentPlace = null;
      options.onPlaceLeave?.();
    }
    if (localPlayer.moving) return;
    const near = town.places.find((item) => distanceTo(item.spot) <= ARRIVE_DISTANCE);
    if (!near) return;
    currentPlace = near.key;
    options.onPlaceArrive?.(near.key);
  };

  // Gửi vị trí cho người chơi khác: tối đa 10 lần / giây, chỉ khi có thay đổi.
  let lastSent = { ...spawn };
  let sendTimer = 0;
  const reportPosition = (dt: number) => {
    sendTimer += dt;
    if (sendTimer < 0.1) return;
    sendTimer = 0;
    const pos = localPlayer.position;
    if (Math.hypot(pos.x - lastSent.x, pos.z - lastSent.z) < 0.03) return;
    lastSent = pos;
    options.onMove?.(pos);
  };

  const marker = new ClickMarker(scene);
  scene.onBeforeRenderObservable.add(() => {
    const direction = steering();
    if (direction) {
      localPlayer.steer(direction);
      marker.setDestination(null);
    } else localPlayer.steer(null);
    updatePlace();
    reportPosition(Math.min(engine.getDeltaTime() / 1000, 0.1));
  });

  /**
   * Đi tới điểm bất kỳ: tìm đường vòng qua vật cản, hiện mũi tên ở đích.
   * `ping`: hiện vòng sáng ở chỗ bấm (bấm mới); giữ chuột kéo thì chỉ dời mũi tên.
   */
  const walkTo = (target: GroundPoint, options: { ping?: boolean; onArrive?: () => void } = {}) => {
    const path = grid.findPath(localPlayer.position, target);
    if (!path.length) {
      if (options.ping) marker.ping(target.x, target.z, false);
      return;
    }
    const end = path[path.length - 1];
    if (options.ping) marker.ping(end.x, end.z, true);
    marker.setDestination(end);
    localPlayer.walk(path, () => {
      marker.setDestination(null);
      options.onArrive?.();
    });
  };

  const goToPlace = (key: TownPlaceKey, ping = true) => {
    const place = town?.places.find((item) => item.key === key);
    if (!place) return;
    // Tới nơi: quay mặt vào cửa.
    walkTo(place.spot, { ping, onArrive: () => localPlayer.face(place.facing.x, place.facing.z) });
  };

  /** Thứ nằm dưới con trỏ: một địa điểm, một điểm trên mặt đất, hoặc không có gì. */
  const pickUnderPointer = (): { place: TownPlaceKey } | { point: GroundPoint } | null => {
    if (!town) {
      const tile = pickTile(scene);
      return tile ? { point: tile } : null;
    }
    const pick = scene.pick(
      scene.pointerX,
      scene.pointerY,
      (mesh) =>
        town.isPlaceMesh(mesh) !== null || (mesh.metadata as { ground?: boolean } | null)?.ground === true,
    );
    if (!pick.hit || !pick.pickedMesh) return null;
    const place = town.isPlaceMesh(pick.pickedMesh);
    if (place) return { place };
    return pick.pickedPoint ? { point: { x: pick.pickedPoint.x, z: pick.pickedPoint.z } } : null;
  };

  // ---------------------------------------------------------------------------
  // Chuột / chạm: nhấn chuột TRÁI hoặc PHẢI (hoặc chạm) là đi ngay, không chờ nhả tay.
  // Giữ nút và rê: nhân vật đi theo con trỏ. Rê lên một địa điểm: con trỏ hình bàn tay.
  // ---------------------------------------------------------------------------
  /** Địa điểm đang được rê chuột lên: làm nổi bật, đổi con trỏ, báo ra ngoài (hiện chú thích). */
  let hovered: TownPlaceKey | null = null;
  const setHovered = (place: TownPlaceKey | null) => {
    if (place === hovered) return;
    hovered = place;
    town?.highlight(place);
    // Babylon tự đặt lại con trỏ mỗi lần chuột nhích theo defaultCursor, nên đổi ở đây.
    scene.defaultCursor = place ? "pointer" : "default";
    canvas.style.cursor = scene.defaultCursor;
    options.onPlaceHover?.(place);
  };
  const onPointerLeave = () => setHovered(null);
  canvas.addEventListener("pointerleave", onPointerLeave);

  const pointers = new Set<number>();
  let holding = false;
  let lastFollow = 0;
  let lastHover = 0;
  const onContextMenu = (event: Event) => event.preventDefault(); // chuột phải không mở menu trình duyệt
  canvas.addEventListener("contextmenu", onContextMenu);

  scene.onPointerObservable.add((pointerInfo) => {
    const event = pointerInfo.event as PointerEvent;
    switch (pointerInfo.type) {
      case PointerEventTypes.POINTERDOWN: {
        pointers.add(event.pointerId);
        // 2 ngón (chụm phóng to) hoặc nút giữa: không phải lệnh đi.
        if (pointers.size > 1 || (event.button !== 0 && event.button !== 2)) {
          holding = false;
          return;
        }
        const target = pickUnderPointer();
        if (!target) return;
        holding = true;
        lastFollow = performance.now();
        if ("place" in target) goToPlace(target.place);
        else walkTo(target.point, { ping: true });
        return;
      }
      case PointerEventTypes.POINTERUP:
        pointers.delete(event.pointerId);
        holding = false;
        return;
      case PointerEventTypes.POINTERMOVE: {
        const now = performance.now();
        if (holding && pointers.size === 1) {
          // Giữ chuột rê: đổi đích liên tục (tối đa ~8 lần / giây để tìm đường không tốn sức).
          if (now - lastFollow < 120) return;
          lastFollow = now;
          const target = pickUnderPointer();
          if (target && "point" in target) walkTo(target.point);
          return;
        }
        if (town && event.pointerType === "mouse" && now - lastHover > 60) {
          lastHover = now;
          const target = pickUnderPointer();
          setHovered(target && "place" in target ? target.place : null);
        }
        return;
      }
    }
  });

  engine.runRenderLoop(() => scene.render());

  // Đổi kích thước khi cửa sổ đổi (xoay điện thoại, kéo cửa sổ) hoặc khi khung chứa canvas đổi.
  window.addEventListener("resize", applyResolution);
  const resizeObserver = new ResizeObserver(() => engine.resize());
  resizeObserver.observe(canvas);

  return {
    setRemotePlayers: (players) => remotePlayers.update(players),
    setMoveInput: (x, y) => {
      stick = { x, y };
    },
    goToPlace: (place) => goToPlace(place, false),
    redrawLabels: () => {
      town?.redrawSigns();
      localPlayer.redrawTag();
      remotePlayers.redrawTags();
    },
    spawn,
    dispose: () => {
      window.removeEventListener("resize", applyResolution);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearKeys);
      canvas.removeEventListener("contextmenu", onContextMenu);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      resizeObserver.disconnect();
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
    },
  };
}
