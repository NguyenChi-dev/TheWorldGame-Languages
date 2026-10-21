import type { Metadata } from "next";
import {
  faArrowRightToBracket,
  faBan,
  faChevronLeft,
  faChevronRight,
  faEnvelopeOpenText,
  faMagnifyingGlass,
  faUserCheck,
  faUsers,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { ADMIN_SECTIONS, ROLE_LABELS, can } from "@lw/shared";
import {
  PLAYER_STATUSES,
  PLAYER_STATUS_LABELS,
  type AccountGroup,
  type AdminPlayersResponse,
  type PlayerStatus,
} from "@lw/shared/api";
import { FaIcon } from "@/components/fa-icon";
import { fieldClass } from "@/components/fields";
import { PageHeader, TabContent, sectionTabs } from "@/components/page-header";
import { PlaceholderPanel } from "@/components/placeholder-panel";
import { Tabs } from "@/components/tabs";
import { ApiCallError, apiRequest } from "@/lib/api";
import { requireSection } from "@/lib/auth";
import { PlayerActions } from "./_components/player-actions";

export const metadata: Metadata = { title: ADMIN_SECTIONS.players.label };

type SearchParams = Promise<{
  tab?: string;
  group?: string;
  search?: string;
  status?: string;
  page?: string;
}>;

const PER_PAGE = 20;

const STATUS_STYLE: Record<PlayerStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  unconfirmed: "bg-amber-50 text-amber-700 ring-amber-200",
  banned: "bg-red-50 text-red-700 ring-red-200",
};

const timeFormat = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const formatTime = (iso: string | null) => (iso ? timeFormat.format(new Date(iso)) : null);

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: IconDefinition;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-secondary bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between text-sm text-slate-500">
        {label}
        <span className={`flex size-8 items-center justify-center rounded-lg ${tone}`}>
          <FaIcon icon={icon} className="text-sm" />
        </span>
      </div>
      <p className="mt-1 font-game text-3xl font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

/**
 * /players: quản lý tài khoản (đăng ký / đăng nhập), chia 2 tab:
 *   - Người chơi (?group mặc định): tài khoản vai trò player.
 *   - Quản trị viên (?group=staff): admin, editor, moderator.
 * Admin và moderator xem được; chỉ admin thấy và dùng được các thao tác (apps/api cũng chặn lại).
 * Dữ liệu lấy qua apps/api (/admin/players) vì email, xác nhận email, khóa tài khoản nằm ở auth.users.
 */
export default async function PlayersPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSection("players");
  const params = await searchParams;
  // Mục con của trang (?tab=). Tab chưa làm thì chỉ hiện khung "Sắp có", không gọi API.
  const { active, bar } = sectionTabs("players", params.tab);
  if (active && !active.ready) {
    return (
      <>
        <PageHeader section="players" />
        {bar}
        <TabContent tab={active.key}>
          <PlaceholderPanel title={active.label} />
        </TabContent>
      </>
    );
  }
  const group: AccountGroup = params.group === "staff" ? "staff" : "players";
  const search = (params.search ?? "").trim();
  const status = PLAYER_STATUSES.includes(params.status as PlayerStatus)
    ? (params.status as PlayerStatus)
    : "all";
  const page = Math.max(1, Number(params.page) || 1);

  const query = new URLSearchParams({
    group,
    search,
    status,
    page: String(page),
    perPage: String(PER_PAGE),
  });
  let data: AdminPlayersResponse | null = null;
  let loadError: string | null = null;
  try {
    data = await apiRequest<AdminPlayersResponse>(`/admin/players?${query}`);
  } catch (error) {
    if (!(error instanceof ApiCallError)) throw error;
    loadError = error.message;
  }

  /** Đường dẫn giữ nguyên bộ lọc hiện tại, chỉ đổi vài tham số. */
  const href = (changes: Record<string, string | number>) => {
    const next = new URLSearchParams({ group, search, status, page: String(page), ...changes });
    if (next.get("group") === "players") next.delete("group");
    if (!next.get("search")) next.delete("search");
    if (next.get("status") === "all") next.delete("status");
    if (next.get("page") === "1") next.delete("page");
    const text = next.toString();
    return text ? `/players?${text}` : "/players";
  };

  const canManage = can(session.role, "players.manage");
  const isStaffTab = group === "staff";
  // Đổi tab: bỏ tìm kiếm / lọc trạng thái / trang của tab cũ.
  const groupHref = (key: AccountGroup) => (key === "staff" ? "/players?group=staff" : "/players");
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1;
  const tabs: { key: "all" | PlayerStatus; label: string; count?: number }[] = [
    { key: "all", label: "Tất cả", count: data?.stats.total },
    { key: "active", label: "Hoạt động", count: data?.stats.active },
    { key: "unconfirmed", label: "Chưa xác nhận", count: data?.stats.unconfirmed },
    { key: "banned", label: "Bị khóa", count: data?.stats.banned },
  ];

  return (
    <>
      <PageHeader section="players" />
      {bar}
      <p className="-mt-2 mb-3 text-sm text-slate-500">
        Tài khoản đăng ký / đăng nhập: xác nhận email, đặt lại mật khẩu, khóa, xóa, đổi vai trò.
      </p>

      <Tabs
        active={group}
        items={[
          {
            key: "players",
            label: "Người chơi",
            href: groupHref("players"),
            count: data?.groups.players,
          },
          {
            key: "staff",
            label: "Quản trị viên",
            href: groupHref("staff"),
            count: data?.groups.staff,
          },
        ]}
      />
      {isStaffTab ? (
        <p className="-mt-2 mb-4 text-xs text-slate-500">
          Tài khoản nhân viên (Quản trị viên, Biên tập viên, Điều hành viên). Muốn khóa hoặc xóa, hãy đổi vai
          trò về Người chơi trước.
        </p>
      ) : null}

      {loadError ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-200">
          {loadError}
        </p>
      ) : null}

      {data ? (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard
            icon={faUsers}
            label={isStaffTab ? "Tổng quản trị viên" : "Tổng người chơi"}
            value={data.stats.total}
            tone="bg-secondary text-accent"
          />
          <StatCard
            icon={faUserCheck}
            label="Đang hoạt động"
            value={data.stats.active}
            tone="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            icon={faEnvelopeOpenText}
            label="Chưa xác nhận"
            value={data.stats.unconfirmed}
            tone="bg-amber-50 text-amber-600"
          />
          <StatCard
            icon={faBan}
            label="Đang bị khóa"
            value={data.stats.banned}
            tone="bg-red-50 text-red-600"
          />
          <StatCard
            icon={faArrowRightToBracket}
            label="Đăng nhập 7 ngày"
            value={data.stats.signedInLast7Days}
            tone="bg-sky-50 text-sky-600"
          />
        </div>
      ) : null}

      <section className="rounded-2xl border border-secondary bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Lọc theo trạng thái" className="flex flex-wrap gap-1.5">
            {tabs.map((tab) => (
              <Link
                key={tab.key}
                href={href({ status: tab.key, page: 1 })}
                aria-current={status === tab.key ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  status === tab.key
                    ? "bg-accent text-white shadow-sm"
                    : "bg-background text-slate-600 hover:bg-secondary hover:text-accent"
                }`}
              >
                {tab.label}
                {tab.count === undefined ? null : <span className="ml-1.5 opacity-75">{tab.count}</span>}
              </Link>
            ))}
          </nav>
          <form action="/players" className="relative w-full sm:w-72">
            {isStaffTab ? <input type="hidden" name="group" value="staff" /> : null}
            {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
            <FaIcon
              icon={faMagnifyingGlass}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400"
            />
            <input
              name="search"
              defaultValue={search}
              placeholder="Tìm email hoặc tên nhân vật..."
              aria-label="Tìm email hoặc tên nhân vật"
              className={`${fieldClass} pl-8`}
            />
          </form>
        </div>

        {data && data.players.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            {search
              ? `Không có tài khoản nào khớp "${search}".`
              : isStaffTab
                ? "Chưa có tài khoản quản trị viên nào."
                : "Chưa có người chơi nào."}
          </p>
        ) : null}

        {data && data.players.length > 0 ? (
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-184 text-left text-sm">
              <thead className="border-b border-secondary text-xs text-slate-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">{isStaffTab ? "Quản trị viên" : "Người chơi"}</th>
                  <th className="py-2 pr-3 font-medium">Vai trò</th>
                  <th className="py-2 pr-3 font-medium">Trạng thái</th>
                  <th className="py-2 pr-3 font-medium">Ngày tạo</th>
                  <th className="py-2 pr-3 font-medium">Đăng nhập gần nhất</th>
                  <th className="py-2 text-right font-medium">{canManage ? "Thao tác" : ""}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary">
                {data.players.map((player) => {
                  const name = player.username ?? player.email ?? "?";
                  return (
                    <tr key={player.id} className="align-middle">
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary font-game text-sm font-bold text-accent">
                            {name.charAt(0).toUpperCase()}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-slate-900">
                              {player.username ?? (
                                <span className="italic text-slate-400">(chưa đặt tên)</span>
                              )}
                              {player.id === session.userId ? (
                                <span className="ml-1.5 text-[11px] font-semibold text-accent">(bạn)</span>
                              ) : null}
                            </span>
                            <span className="block truncate text-xs text-slate-500">{player.email}</span>
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-xs font-semibold text-slate-600">
                        {ROLE_LABELS[player.role]}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span
                          className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${STATUS_STYLE[player.status]}`}
                          title={
                            player.bannedUntil ? `Khóa tới ${formatTime(player.bannedUntil)}` : undefined
                          }
                        >
                          {PLAYER_STATUS_LABELS[player.status]}
                        </span>
                        {isStaffTab ? (
                          <span
                            className={`ml-1.5 inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                              player.mfaEnabled
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                : "bg-amber-50 text-amber-700 ring-amber-200"
                            }`}
                            title={
                              player.mfaEnabled
                                ? "Đã thiết lập xác thực hai lớp"
                                : "Chưa thiết lập xác thực hai lớp: không làm được thao tác nhạy cảm"
                            }
                          >
                            {player.mfaEnabled ? "2 lớp ✓" : "Chưa 2 lớp"}
                          </span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap py-2.5 pr-3 text-xs text-slate-500">
                        {formatTime(player.createdAt)}
                      </td>
                      <td className="whitespace-nowrap py-2.5 pr-3 text-xs text-slate-500">
                        {formatTime(player.lastSignInAt) ?? (
                          <span className="italic text-slate-400">Chưa đăng nhập</span>
                        )}
                      </td>
                      <td className="py-2.5 text-right">
                        {canManage ? (
                          <PlayerActions player={player} isSelf={player.id === session.userId} />
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {data && pageCount > 1 ? (
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-secondary pt-3 text-xs text-slate-500">
            <span>
              Trang {data.page}/{pageCount} · {data.total} tài khoản
            </span>
            <span className="flex gap-1.5">
              {data.page > 1 ? (
                <Link
                  href={href({ page: data.page - 1 })}
                  className="rounded-lg px-2.5 py-1.5 hover:bg-secondary hover:text-accent"
                >
                  <FaIcon icon={faChevronLeft} /> Trước
                </Link>
              ) : null}
              {data.page < pageCount ? (
                <Link
                  href={href({ page: data.page + 1 })}
                  className="rounded-lg px-2.5 py-1.5 hover:bg-secondary hover:text-accent"
                >
                  Sau <FaIcon icon={faChevronRight} />
                </Link>
              ) : null}
            </span>
          </div>
        ) : null}
      </section>
    </>
  );
}
