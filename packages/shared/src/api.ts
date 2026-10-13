/**
 * Giao kèo giữa apps/api (máy chủ) và các app gọi vào nó (web, admin, app điện thoại).
 *
 * - Mỗi route có schema Zod cho dữ liệu GỬI LÊN (Request) và dữ liệu TRẢ VỀ (Response).
 * - apps/api dùng schema để kiểm tra dữ liệu thật lúc chạy.
 * - apps/web chỉ dùng KIỂU (import type), nên Zod không bị đóng gói vào trình duyệt.
 *
 * Nhập từ "@lw/shared/api" (không phải "@lw/shared") để các gói khác không phải kéo theo Zod.
 */
import { z } from "zod";
import { SEEDS, type SeedId } from "./seeds";

// -----------------------------------------------------------------------------
// Dùng chung
// -----------------------------------------------------------------------------

/** Mọi lỗi từ apps/api đều có dạng này. */
export const ErrorResponse = z.object({ error: z.string() });
export type ErrorResponse = z.infer<typeof ErrorResponse>;

const PlotId = z.uuid({ error: "plotId phải là mã ô đất hợp lệ" });
const SeedIdSchema = z.enum(Object.keys(SEEDS) as [SeedId, ...SeedId[]]);
const Quantity = z.int().min(1).max(99);

/** Một dòng trong túi đồ trả về cho người chơi. */
export const InventoryEntry = z.object({
  itemId: z.string(),
  quantity: z.int().min(0),
});
export type InventoryEntry = z.infer<typeof InventoryEntry>;

/** Một ô đất trả về cho người chơi. Thời gian dạng chuỗi ISO, theo giờ máy chủ. */
export const PlotDto = z.object({
  id: z.string(),
  x: z.int(),
  z: z.int(),
  seedId: SeedIdSchema.nullable(),
  plantedAt: z.string().nullable(),
  readyAt: z.string().nullable(),
});
export type PlotDto = z.infer<typeof PlotDto>;

/** Số vàng và túi đồ sau một thao tác làm thay đổi tài sản. */
const WalletResponse = z.object({
  gold: z.int().min(0),
  inventory: z.array(InventoryEntry),
});

// -----------------------------------------------------------------------------
// GET /health
// -----------------------------------------------------------------------------

export const HealthResponse = z.object({
  ok: z.literal(true),
  service: z.literal("api"),
  /** Giờ máy chủ dạng ISO, ví dụ "2026-10-13T02:00:00.000Z". */
  time: z.string(),
});
export type HealthResponse = z.infer<typeof HealthResponse>;

// -----------------------------------------------------------------------------
// GET /catalog/seeds
// -----------------------------------------------------------------------------

export const SeedCatalogEntry = z.object({
  id: SeedIdSchema,
  buyPrice: z.int(),
  sellPrice: z.int(),
  growSeconds: z.int(),
  wordId: z.string(),
  word: z.string(),
  meaning: z.string(),
});
export const CatalogSeedsResponse = z.object({ seeds: z.array(SeedCatalogEntry) });
export type CatalogSeedsResponse = z.infer<typeof CatalogSeedsResponse>;

// -----------------------------------------------------------------------------
// GET /me
// -----------------------------------------------------------------------------

export const MeResponse = z.object({
  id: z.string(),
  email: z.string().nullable(),
});
export type MeResponse = z.infer<typeof MeResponse>;

// -----------------------------------------------------------------------------
// Nông trại: POST /farm/plant, /farm/water, /farm/harvest
// -----------------------------------------------------------------------------

export const PlantRequest = z.object({ plotId: PlotId, seedId: SeedIdSchema });
export type PlantRequest = z.infer<typeof PlantRequest>;
export const PlantResponse = z.object({ plot: PlotDto, inventory: z.array(InventoryEntry) });
export type PlantResponse = z.infer<typeof PlantResponse>;

export const WaterRequest = z.object({ plotId: PlotId });
export type WaterRequest = z.infer<typeof WaterRequest>;
export const WaterResponse = z.object({ plot: PlotDto });
export type WaterResponse = z.infer<typeof WaterResponse>;

export const HarvestRequest = z.object({ plotId: PlotId });
export type HarvestRequest = z.infer<typeof HarvestRequest>;
export const HarvestResponse = WalletResponse;
export type HarvestResponse = z.infer<typeof HarvestResponse>;

// -----------------------------------------------------------------------------
// Mua bán: POST /shop/buy, /shop/sell
// -----------------------------------------------------------------------------

export const BuyRequest = z.object({ itemId: z.string().min(1).max(64), quantity: Quantity });
export type BuyRequest = z.infer<typeof BuyRequest>;
export const BuyResponse = WalletResponse;
export type BuyResponse = z.infer<typeof BuyResponse>;

export const SellRequest = z.object({ itemId: z.string().min(1).max(64), quantity: Quantity });
export type SellRequest = z.infer<typeof SellRequest>;
export const SellResponse = WalletResponse;
export type SellResponse = z.infer<typeof SellResponse>;

// -----------------------------------------------------------------------------
// Bài học: POST /lessons/:id/submit
// -----------------------------------------------------------------------------

export const LessonParams = z.object({ id: z.string().min(1).max(64) });
export type LessonParams = z.infer<typeof LessonParams>;

export const LessonSubmitRequest = z.object({
  answers: z
    .array(z.object({ wordId: z.string().min(1).max(64), answer: z.string().max(200) }))
    .min(1)
    .max(50),
});
export type LessonSubmitRequest = z.infer<typeof LessonSubmitRequest>;

export const LessonSubmitResponse = z.object({
  correct: z.int().min(0),
  total: z.int().min(0),
  goldEarned: z.int().min(0),
  gold: z.int().min(0),
});
export type LessonSubmitResponse = z.infer<typeof LessonSubmitResponse>;

// -----------------------------------------------------------------------------
// Quản trị: GET /admin/stats
// -----------------------------------------------------------------------------

/** Query string, ví dụ /admin/stats?days=30. Query luôn là chuỗi nên dùng coerce để đổi sang số. */
export const AdminStatsQuery = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
});
export type AdminStatsQuery = z.infer<typeof AdminStatsQuery>;

export const AdminStatsResponse = z.object({
  players: z.int().min(0),
  activePlayers: z.int().min(0),
  words: z.int().min(0),
  items: z.int().min(0),
});
export type AdminStatsResponse = z.infer<typeof AdminStatsResponse>;
