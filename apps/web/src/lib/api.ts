/**
 * Gọi máy chủ apps/api từ trình duyệt.
 *
 * - Địa chỉ lấy từ NEXT_PUBLIC_API_URL (mặc định http://localhost:4000).
 * - Nếu người chơi đã đăng nhập Supabase, tự gắn "Authorization: Bearer <token>".
 * - Kiểu dữ liệu gửi lên/trả về lấy từ @lw/shared/api (import type: không kéo Zod vào trình duyệt).
 *
 * Mọi thay đổi dữ liệu game (vàng, nông trại, mua bán, bài học) PHẢI đi qua các hàm ở đây.
 */
import type {
  AdminStatsQuery,
  AdminStatsResponse,
  BuyRequest,
  BuyResponse,
  CatalogSeedsResponse,
  ErrorResponse,
  HarvestRequest,
  HarvestResponse,
  HealthResponse,
  LessonSubmitRequest,
  LessonSubmitResponse,
  MeResponse,
  PlantRequest,
  PlantResponse,
  SellRequest,
  SellResponse,
  WaterRequest,
  WaterResponse,
} from "@lw/shared/api";
import { createClient } from "@/lib/supabase/client";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

/** Lỗi từ API. `status` = 0 nghĩa là không kết nối được (API tắt, mất mạng...). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Token đăng nhập Supabase hiện tại, hoặc null nếu chưa đăng nhập / chưa cấu hình Supabase. */
async function getAccessToken(): Promise<string | null> {
  if (!isSupabaseConfigured || typeof window === "undefined") return null;
  const { data } = await createClient().auth.getSession();
  return data.session?.access_token ?? null;
}

interface ApiFetchOptions {
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal;
  /** false: không gắn token (cho route công khai như /health). Mặc định true. */
  auth?: boolean;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = "GET", body, signal, auth = true } = options;

  const headers = new Headers();
  if (body !== undefined) headers.set("Content-Type", "application/json");
  const token = auth ? await getAccessToken() : null;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(0, "Không kết nối được tới máy chủ API");
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (data as Partial<ErrorResponse> | null)?.error ?? `Lỗi máy chủ (${response.status})`;
    throw new ApiError(response.status, message);
  }
  return data as T;
}

/** Các hàm gọi từng route của apps/api, đã có sẵn kiểu dữ liệu. */
export const api = {
  health: (signal?: AbortSignal) => apiFetch<HealthResponse>("/health", { signal, auth: false }),
  seeds: () => apiFetch<CatalogSeedsResponse>("/catalog/seeds", { auth: false }),
  me: () => apiFetch<MeResponse>("/me"),

  plant: (body: PlantRequest) => apiFetch<PlantResponse>("/farm/plant", { method: "POST", body }),
  water: (body: WaterRequest) => apiFetch<WaterResponse>("/farm/water", { method: "POST", body }),
  harvest: (body: HarvestRequest) => apiFetch<HarvestResponse>("/farm/harvest", { method: "POST", body }),

  buy: (body: BuyRequest) => apiFetch<BuyResponse>("/shop/buy", { method: "POST", body }),
  sell: (body: SellRequest) => apiFetch<SellResponse>("/shop/sell", { method: "POST", body }),

  submitLesson: (lessonId: string, body: LessonSubmitRequest) =>
    apiFetch<LessonSubmitResponse>(`/lessons/${encodeURIComponent(lessonId)}/submit`, {
      method: "POST",
      body,
    }),

  adminStats: (query: Partial<AdminStatsQuery> = {}) => {
    const search = query.days ? `?days=${query.days}` : "";
    return apiFetch<AdminStatsResponse>(`/admin/stats${search}`);
  },
};
