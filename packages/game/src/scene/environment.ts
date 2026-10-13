import {
  ArcRotateCamera,
  Camera,
  Color4,
  DirectionalLight,
  HemisphericLight,
  Scene,
  Vector3,
} from "@babylonjs/core";

export function createLights(scene: Scene) {
  scene.clearColor = new Color4(0.62, 0.84, 0.96, 1); // màu trời

  const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.75;

  const sun = new DirectionalLight("sun", new Vector3(-0.5, -1, -0.4), scene);
  sun.intensity = 0.6;
}

/**
 * Camera nhìn chéo từ trên xuống, xoay quanh tâm lưới.
 * - Chuột: kéo trái để xoay, kéo phải (hoặc Ctrl + kéo) để di chuyển, cuộn để phóng to.
 * - Cảm ứng: một ngón để xoay, hai ngón để chụm phóng to và di chuyển.
 */
export function createCamera(scene: Scene) {
  const camera = new ArcRotateCamera("camera", -Math.PI / 4, Math.PI / 3.2, 22, Vector3.Zero(), scene);

  camera.lowerRadiusLimit = 8;
  camera.upperRadiusLimit = 40;
  camera.lowerBetaLimit = 0.2;
  camera.upperBetaLimit = Math.PI / 2.3; // không cho camera chui xuống dưới mặt đất
  camera.wheelDeltaPercentage = 0.01;
  camera.useNaturalPinchZoom = true;
  camera.panningSensibility = 150; // số càng nhỏ, kéo càng nhanh
  camera.panningDistanceLimit = 12; // không cho kéo quá xa khỏi lưới

  // Gắn điều khiển vào canvas của engine. CSS "touch-none" trên canvas ngăn trang bị cuộn khi vuốt.
  camera.attachControl(true);
  fitCameraToScreen(camera);
  return camera;
}

/**
 * Màn hình dọc (điện thoại): giữ cố định góc nhìn theo chiều NGANG để lưới đất không bị cắt hai bên.
 * Màn hình ngang: giữ cố định theo chiều dọc như mặc định. Gọi lại mỗi khi đổi kích thước.
 */
export function fitCameraToScreen(camera: ArcRotateCamera) {
  const portrait = camera.getEngine().getAspectRatio(camera) < 1;
  camera.fovMode = portrait ? Camera.FOVMODE_HORIZONTAL_FIXED : Camera.FOVMODE_VERTICAL_FIXED;
}
