/**
 * @lw/game: phần 3D của Language World, viết bằng Babylon.js.
 * QUY TẮC: gói này KHÔNG import React. Giao tiếp với app web chỉ qua startGame() và các callback.
 */
export { startGame, type GameHandle, type StartGameOptions, type TilePosition } from "./start-game";
export {
  startCharacterPreview,
  type CharacterPreviewHandle,
  type CharacterPreviewOptions,
} from "./character-preview";
