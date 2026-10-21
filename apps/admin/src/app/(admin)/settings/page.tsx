import type { Metadata } from "next";
import Link from "next/link";
import { ADMIN_SECTIONS, AAL2_PERMISSIONS } from "@lw/shared";
import type { AdminPlayersResponse } from "@lw/shared/api";
import { Card } from "@/components/card";
import { PageTitle } from "@/components/page-title";
import { apiRequest } from "@/lib/api";
import { readMfaRequired, requireSection } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MfaSwitch } from "./mfa-switch";

export const metadata: Metadata = { title: ADMIN_SECTIONS.settings.label };

const SENSITIVE_LABELS: Record<(typeof AAL2_PERMISSIONS)[number], string> = {
  "staff.manage": "Đổi vai trò, đặt lại xác thực hai lớp của nhân viên",
  "players.manage": "Quản lý tài khoản người chơi (khóa, đổi tên, xóa, đặt lại mật khẩu)",
  "content.delete": "Xóa vùng đất, khu vực, kỹ năng",
  "settings.manage": "Đổi cài đặt bảo mật trên trang này",
};

/** Cài đặt bảo mật: công tắc bắt buộc xác thực hai lớp. Chỉ admin. */
export default async function SettingsPage() {
  const session = await requireSection("settings");
  const required = await readMfaRequired(await createClient());

  // Đếm nhân viên chưa thiết lập 2 lớp (để cảnh báo trước khi bật). apps/api không chạy thì bỏ qua.
  let staffWithoutMfa: number | null = null;
  try {
    const staff = await apiRequest<AdminPlayersResponse>("/admin/players?group=staff&perPage=100");
    staffWithoutMfa = staff.players.filter((player) => !player.mfaEnabled).length;
  } catch {
    staffWithoutMfa = null;
  }
  const isAal2 = session.aal === "aal2";

  return (
    <>
      <PageTitle description="Áp dụng cho mọi nhân viên (admin, biên tập viên, điều hành viên).">
        {ADMIN_SECTIONS.settings.label}
      </PageTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Bắt buộc xác thực hai lớp khi đăng nhập">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm leading-relaxed text-slate-600">
              {required
                ? "Đang BẬT: nhân viên phải nhập mã 6 số từ ứng dụng xác thực sau mật khẩu, chưa thiết lập thì phải quét mã QR trước."
                : "Đang TẮT: nhân viên vào trang quản trị bằng mật khẩu. Thao tác nhạy cảm vẫn cần xác thực hai lớp."}
            </p>
            <MfaSwitch required={required} canChange={isAal2} staffWithoutMfa={staffWithoutMfa} />
          </div>
          {!isAal2 ? (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
              Đổi cài đặt này cần xác thực hai lớp.{" "}
              <Link href="/login/mfa?next=%2Fsettings" className="font-semibold underline">
                Xác thực ngay
              </Link>
            </p>
          ) : null}
          {staffWithoutMfa ? (
            <p className="mt-3 text-xs text-slate-500">
              {staffWithoutMfa} nhân viên chưa thiết lập xác thực hai lớp.{" "}
              <Link href="/players?group=staff" className="font-semibold text-accent hover:underline">
                Xem danh sách
              </Link>
            </p>
          ) : null}
        </Card>
        <Card title="Luôn cần xác thực hai lớp">
          <p className="mb-2 text-sm text-slate-600">
            Dù công tắc bật hay tắt, các thao tác sau luôn đòi mã:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {AAL2_PERMISSIONS.map((permission) => (
              <li key={permission}>{SENSITIVE_LABELS[permission]}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Nhân viên mất điện thoại: vào Người chơi → tab Quản trị viên → ⋮ → “Đặt lại xác thực hai lớp”.
          </p>
        </Card>
      </div>
    </>
  );
}
