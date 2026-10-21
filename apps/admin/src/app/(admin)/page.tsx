import Link from "next/link";
import {
  ADMIN_SECTIONS,
  ROLE_LABELS,
  canAccessSection,
  isRole,
  sectionsForRole,
  type AdminSectionKey,
} from "@lw/shared";
import { Alert } from "@/components/auth/form";
import { Card } from "@/components/card";
import { PageTitle } from "@/components/page-title";
import { StatCard } from "@/components/stat-card";
import { CountUp } from "@lw/ui/lightswind";
import { Reveal } from "@lw/ui/motion";
import { SECTION_META } from "@/components/section-meta";
import { requireSection } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const RECENT_LIMIT = 6;

/** Tên dễ đọc cho các thao tác trong admin_logs. Thao tác chưa có tên thì hiện mã gốc. */
const ACTION_LABELS: Record<string, string> = {
  "profiles.update_role": "Đổi vai trò",
  "profiles.bootstrap_admin": "Cấp admin đầu tiên",
};

const timeFormat = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Ví dụ "13/10 20:39" (giờ Việt Nam). */
function formatTime(iso: string) {
  const part = Object.fromEntries(timeFormat.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${part.day}/${part.month} ${part.hour}:${part.minute}`;
}

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const session = await requireSection("overview");
  const { denied } = await searchParams;
  const supabase = await createClient();

  // Chỉ hỏi database những gì vai trò này được xem (RLS cũng chặn lần nữa).
  const canSeePlayers = canAccessSection(session.role, "players");
  const canSeeLogs = canAccessSection(session.role, "logs");

  const count = async (table: string) => {
    const { count: total, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    return error ? null : (total ?? 0);
  };

  const [lands, areas, media, players, logs, profiles] = await Promise.all([
    count("lands"),
    count("areas"),
    count("media"),
    canSeePlayers ? count("profiles") : Promise.resolve(null),
    canSeeLogs
      ? supabase
          .from("admin_logs")
          .select("id, created_at, actor_role, action, target_table, target_id, reason")
          .order("created_at", { ascending: false })
          .limit(RECENT_LIMIT)
      : Promise.resolve(null),
    canSeePlayers
      ? supabase
          .from("profiles")
          .select("id, username, role, created_at")
          .order("created_at", { ascending: false })
          .limit(RECENT_LIMIT)
      : Promise.resolve(null),
  ]);

  // key: mục trên thanh bên mà ô số liệu dẫn tới (lấy icon và đường dẫn của mục đó).
  const stats: { id: string; key: AdminSectionKey; label: string; value: number | null; show: boolean }[] = [
    { id: "lands", key: "lands", label: "Vùng đất", value: lands, show: true },
    { id: "areas", key: "lands", label: "Khu vực", value: areas, show: true },
    { id: "media", key: "media", label: "Ảnh", value: media, show: true },
    { id: "players", key: "players", label: "Tài khoản", value: players, show: canSeePlayers },
  ];
  const otherSections = sectionsForRole(session.role).filter((section) => section.key !== "overview");

  return (
    <>
      <PageTitle description={`${session.email ?? ""} · ${ROLE_LABELS[session.role]}`}>Tổng quan</PageTitle>
      {denied ? (
        <div className="mb-4">
          <Alert tone="error">Bạn không có quyền vào trang vừa mở.</Alert>
        </div>
      ) : null}

      {/* Chỉ số học tập và kinh tế: chưa có dữ liệu (game chưa ghi tiến độ / vàng), hiện "—". */}
      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ADMIN_SECTIONS.overview.tabs.map((metric) => (
          <StatCard key={metric.key} label={metric.label} />
        ))}
      </div>

      {/* Số liệu tổng: bấm vào để tới trang quản lý tương ứng (nếu vai trò được vào). */}
      <Reveal className="grid grid-cols-2 gap-3 lg:grid-cols-4" delay={0.1}>
        {stats
          .filter((stat) => stat.show)
          .map((stat) => {
            const Icon = SECTION_META[stat.key].icon;
            const linkable = canAccessSection(session.role, stat.key);
            const body = (
              <>
                <div className="flex items-center justify-between text-sm text-slate-500">
                  {stat.label}
                  <Icon className="size-4.5 text-primary" />
                </div>
                <p className="mt-1 font-game text-3xl font-extrabold text-slate-900">
                  {typeof stat.value === "number" ? <CountUp value={stat.value} /> : "—"}
                </p>
              </>
            );
            const className = "rounded-2xl border border-secondary bg-white p-4 shadow-sm";
            return linkable ? (
              <Link
                key={stat.id}
                href={ADMIN_SECTIONS[stat.key].href}
                className={`${className} transition hover:border-primary/60 hover:shadow-md`}
              >
                {body}
              </Link>
            ) : (
              <div key={stat.id} className={className}>
                {body}
              </div>
            );
          })}
      </Reveal>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {logs ? (
          <Card title="Hoạt động quản trị gần đây" action={{ href: "/logs", label: "Xem nhật ký" }}>
            {logs.error ? (
              <p className="py-4 text-sm text-red-700">Không đọc được nhật ký.</p>
            ) : logs.data.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">Chưa có hoạt động nào.</p>
            ) : (
              <ul className="divide-y divide-secondary">
                {logs.data.map((log) => (
                  <li key={log.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800">
                        {ACTION_LABELS[log.action] ?? log.action}
                        <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[11px] font-semibold text-accent">
                          {isRole(log.actor_role) ? ROLE_LABELS[log.actor_role] : log.actor_role}
                        </span>
                      </p>
                      {log.reason ? <p className="truncate text-xs text-slate-500">{log.reason}</p> : null}
                    </div>
                    <time className="shrink-0 text-xs text-slate-400">{formatTime(log.created_at)}</time>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : null}

        {profiles ? (
          <Card title="Tài khoản mới" action={{ href: "/players", label: "Quản lý" }}>
            {profiles.error ? (
              <p className="py-4 text-sm text-red-700">Không đọc được danh sách tài khoản.</p>
            ) : (
              <ul className="divide-y divide-secondary">
                {profiles.data.map((profile) => (
                  <li key={profile.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="truncate font-medium text-slate-800">
                      {profile.username ?? "(chưa đặt tên)"}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                          profile.role === "player"
                            ? "bg-slate-100 text-slate-500"
                            : "bg-secondary text-accent"
                        }`}
                      >
                        {isRole(profile.role) ? ROLE_LABELS[profile.role] : profile.role}
                      </span>
                      <time className="text-xs text-slate-400">{formatTime(profile.created_at)}</time>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : null}

        {/* Vai trò không xem được nhật ký/tài khoản (ví dụ editor): hiện các mục được làm. */}
        {!logs && !profiles ? (
          <Card title="Việc của bạn">
            <ul className="divide-y divide-secondary">
              {otherSections.map((section) => {
                const { icon: Icon, description } = SECTION_META[section.key];
                return (
                  <li key={section.key}>
                    <Link
                      href={section.href}
                      className="flex items-center gap-3 py-2.5 text-sm hover:text-accent"
                    >
                      <Icon className="size-4.5 shrink-0 text-primary" />
                      <span className="font-medium">{section.label}</span>
                      <span className="truncate text-xs text-slate-500">{description}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : null}
      </div>
    </>
  );
}
