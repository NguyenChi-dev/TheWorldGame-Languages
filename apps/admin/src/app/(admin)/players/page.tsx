import type { Metadata } from "next";
import { ADMIN_SECTIONS, ROLE_LABELS, isRole } from "@lw/shared";
import { Panel } from "@lw/ui";
import { PageTitle } from "@/components/page-title";
import { requireSection } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RoleForm } from "./role-form";

export const metadata: Metadata = { title: ADMIN_SECTIONS.players.label };

const RECENT_LIMIT = 20;

export default async function PlayersPage() {
  await requireSection("players");

  // RLS: chỉ admin và moderator (đã qua 2 lớp) đọc được hồ sơ của người khác.
  const supabase = await createClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, username, role, created_at")
    .order("created_at", { ascending: false })
    .limit(RECENT_LIMIT);

  return (
    <>
      <PageTitle>{ADMIN_SECTIONS.players.label}</PageTitle>

      <Panel title={`Tài khoản mới nhất (${RECENT_LIMIT})`}>
        {error ? (
          <p className="text-sm text-red-700">Không đọc được danh sách tài khoản.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Tên hiển thị</th>
                  <th className="py-2 pr-4">Vai trò</th>
                  <th className="py-2 pr-4">Ngày tạo</th>
                  <th className="py-2">Mã người dùng</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => (
                  <tr key={profile.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-semibold">{profile.username ?? "(chưa đặt)"}</td>
                    <td className="py-2 pr-4">
                      {isRole(profile.role) ? ROLE_LABELS[profile.role] : profile.role}
                    </td>
                    <td className="py-2 pr-4">{new Date(profile.created_at).toLocaleString("vi-VN")}</td>
                    <td className="select-all py-2 font-mono text-xs text-slate-500">{profile.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Moderator cũng thấy form này nhưng server action sẽ từ chối: chỉ admin đổi được vai trò. */}
      <Panel title="Cấp / đổi vai trò (chỉ admin)" className="mt-6 max-w-md">
        <RoleForm />
      </Panel>
    </>
  );
}
