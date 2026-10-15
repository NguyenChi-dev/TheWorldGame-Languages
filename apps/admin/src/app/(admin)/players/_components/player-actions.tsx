"use client";

import {
  faBan,
  faEllipsisVertical,
  faEnvelopeCircleCheck,
  faKey,
  faLockOpen,
  faPen,
  faTrashCan,
  faUserShield,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { ROLE_LABELS, ROLES } from "@lw/shared";
import type { AdminPlayer } from "@lw/shared/api";
import { Button, Dialog, useToast } from "@lw/ui";
import { FaIcon } from "@/components/fa-icon";
import { Field, fieldClass } from "@/components/fields";
import type { ActionResult, ActionState } from "@/lib/action-state";
import {
  banPlayer,
  changeUserRole,
  confirmPlayerEmail,
  deletePlayer,
  renamePlayer,
  sendPlayerPasswordReset,
  unbanPlayer,
} from "../actions";

type DialogKind = "rename" | "role" | "ban" | "unban" | "delete" | null;

const BAN_DURATIONS: { value: string; label: string }[] = [
  { value: "1", label: "1 ngày" },
  { value: "3", label: "3 ngày" },
  { value: "7", label: "7 ngày" },
  { value: "30", label: "30 ngày" },
  { value: "forever", label: "Vô thời hạn" },
];

/** Một dòng trong menu thao tác. */
function MenuItem({
  icon,
  label,
  onClick,
  danger,
  disabled,
  hint,
}: {
  icon: IconDefinition;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      title={hint}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
        danger ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-secondary hover:text-accent"
      }`}
    >
      <FaIcon icon={icon} fixedWidth className="text-xs" />
      {label}
    </button>
  );
}

/**
 * Nút "⋮" ở mỗi dòng người chơi: menu thao tác + hộp thoại cho thao tác cần nhập (đổi tên, vai trò,
 * khóa, mở khóa, xóa). Chỉ admin thấy. Không thao tác được trên chính mình; khóa / xóa chỉ áp dụng
 * cho tài khoản người chơi (apps/api cũng chặn lại).
 */
export function PlayerActions({ player, isSelf }: { player: AdminPlayer; isSelf: boolean }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  /** Vị trí menu (position: fixed) để không bị khung cuộn của bảng cắt mất. */
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const name = player.username ?? player.email ?? "tài khoản này";
  const isStaff = player.role !== "player";

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    // Cuộn / đổi cỡ cửa sổ thì menu lệch khỏi nút: đóng luôn.
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  /** Chạy thao tác, báo kết quả bằng toast; thành công thì đóng hộp thoại. */
  function run(action: () => Promise<ActionResult>) {
    setOpen(false);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(result.message);
        setDialog(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  function openDialog(kind: DialogKind) {
    setOpen(false);
    setDialog(kind);
  }

  if (isSelf) return <span className="text-xs text-slate-400">—</span>;

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        onClick={(event) => {
          if (!open) {
            // Mở xuống dưới nút; gần đáy màn hình thì mở lên trên.
            const rect = event.currentTarget.getBoundingClientRect();
            const right = window.innerWidth - rect.right;
            setMenuStyle(
              rect.bottom + 320 > window.innerHeight
                ? { right, bottom: window.innerHeight - rect.top + 4 }
                : { right, top: rect.bottom + 4 },
            );
          }
          setOpen((value) => !value);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Thao tác với ${name}`}
        disabled={pending}
        className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-secondary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
      >
        <FaIcon icon={faEllipsisVertical} />
      </button>

      {open ? (
        <div
          role="menu"
          style={menuStyle}
          className="fixed z-40 w-64 rounded-xl border border-secondary bg-white p-1.5 shadow-xl"
        >
          {player.status === "unconfirmed" ? (
            <MenuItem
              icon={faEnvelopeCircleCheck}
              label="Xác nhận email"
              onClick={() => run(() => confirmPlayerEmail(player.id))}
            />
          ) : null}
          <MenuItem
            icon={faKey}
            label="Gửi email đặt lại mật khẩu"
            disabled={!player.email}
            onClick={() => run(() => sendPlayerPasswordReset(player.id))}
          />
          <MenuItem icon={faPen} label="Đổi tên nhân vật" onClick={() => openDialog("rename")} />
          <MenuItem icon={faUserShield} label="Đổi vai trò" onClick={() => openDialog("role")} />
          <div className="my-1 h-px bg-secondary" />
          {player.status === "banned" ? (
            <MenuItem icon={faLockOpen} label="Mở khóa tài khoản" onClick={() => openDialog("unban")} />
          ) : (
            <MenuItem
              icon={faBan}
              label="Khóa tài khoản"
              danger
              disabled={isStaff}
              hint={isStaff ? "Tài khoản nhân viên: hạ vai trò xuống Người chơi trước" : undefined}
              onClick={() => openDialog("ban")}
            />
          )}
          <MenuItem
            icon={faTrashCan}
            label="Xóa tài khoản"
            danger
            disabled={isStaff}
            hint={isStaff ? "Tài khoản nhân viên: hạ vai trò xuống Người chơi trước" : undefined}
            onClick={() => openDialog("delete")}
          />
        </div>
      ) : null}

      {dialog === "rename" ? (
        <RenameDialog player={player} pending={pending} onClose={() => setDialog(null)} run={run} />
      ) : null}
      {dialog === "role" ? <RoleDialog player={player} onClose={() => setDialog(null)} /> : null}
      {dialog === "ban" ? (
        <BanDialog player={player} pending={pending} onClose={() => setDialog(null)} run={run} />
      ) : null}
      {dialog === "unban" ? (
        <ReasonDialog
          title={`Mở khóa ${name}?`}
          confirmLabel="Mở khóa"
          pending={pending}
          onClose={() => setDialog(null)}
          onConfirm={(reason) => run(() => unbanPlayer(player.id, { reason }))}
        />
      ) : null}
      {dialog === "delete" ? (
        <DeleteDialog player={player} pending={pending} onClose={() => setDialog(null)} run={run} />
      ) : null}
    </div>
  );
}

type Runner = (action: () => Promise<ActionResult>) => void;

function RenameDialog({
  player,
  pending,
  onClose,
  run,
}: {
  player: AdminPlayer;
  pending: boolean;
  onClose: () => void;
  run: Runner;
}) {
  const [username, setUsername] = useState(player.username ?? "");
  return (
    <Dialog
      open
      onClose={onClose}
      title="Đổi tên nhân vật"
      description={player.email ?? undefined}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            Hủy
          </Button>
          <Button
            size="sm"
            disabled={pending || username.trim().length < 3}
            onClick={() => run(() => renamePlayer(player.id, { username: username.trim() }))}
          >
            {pending ? "Đang lưu..." : "Lưu tên mới"}
          </Button>
        </>
      }
    >
      <Field
        label="Tên nhân vật mới"
        hint="3–32 ký tự, không dấu cách, có ít nhất 1 ký tự đặc biệt · không trùng người khác"
      >
        {(id) => (
          <input
            id={id}
            value={username}
            maxLength={32}
            onChange={(event) => setUsername(event.target.value)}
            className={fieldClass}
          />
        )}
      </Field>
    </Dialog>
  );
}

/** Đổi vai trò dùng lại server action changeUserRole (ghi nhật ký, RLS kiểm tra lần nữa). */
function RoleDialog({ player, onClose }: { player: AdminPlayer; onClose: () => void }) {
  const toast = useToast();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, formData) => {
    const result = await changeUserRole(prev, formData);
    if (result.message) {
      toast.success(result.message);
      onClose();
    }
    return result;
  }, {});
  return (
    <Dialog
      open
      onClose={onClose}
      title="Đổi vai trò"
      description={player.username ?? player.email ?? undefined}
    >
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="userId" value={player.id} />
        <Field label="Vai trò mới">
          {(id) => (
            <select id={id} name="role" defaultValue={player.role} className={fieldClass}>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Lý do (ghi vào nhật ký)">
          {(id) => <input id={id} name="reason" required className={fieldClass} />}
        </Field>
        {state.error ? <p className="text-sm text-red-700">{state.error}</p> : null}
        <div className="flex justify-end gap-2 border-t border-secondary pt-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            Hủy
          </Button>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Đang lưu..." : "Đổi vai trò"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function BanDialog({
  player,
  pending,
  onClose,
  run,
}: {
  player: AdminPlayer;
  pending: boolean;
  onClose: () => void;
  run: Runner;
}) {
  const [duration, setDuration] = useState("7");
  const [reason, setReason] = useState("");
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Khóa ${player.username ?? player.email}?`}
      description="Người chơi không đăng nhập được nữa. Phiên đang mở hết hạn trong tối đa 1 giờ."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            Hủy
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={pending || !reason.trim()}
            onClick={() =>
              run(() =>
                banPlayer(player.id, {
                  reason: reason.trim(),
                  days: duration === "forever" ? null : Number(duration),
                }),
              )
            }
          >
            <FaIcon icon={faBan} />
            {pending ? "Đang khóa..." : "Khóa tài khoản"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-xs font-semibold text-slate-600">Thời gian khóa</p>
          <div className="flex flex-wrap gap-1.5">
            {BAN_DURATIONS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setDuration(item.value)}
                aria-pressed={duration === item.value}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  duration === item.value
                    ? "bg-red-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-red-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <Field label="Lý do (ghi vào nhật ký)">
          {(id) => (
            <input
              id={id}
              value={reason}
              maxLength={300}
              placeholder="Ví dụ: spam kênh chat"
              onChange={(event) => setReason(event.target.value)}
              className={fieldClass}
            />
          )}
        </Field>
      </div>
    </Dialog>
  );
}

function ReasonDialog({
  title,
  confirmLabel,
  pending,
  onClose,
  onConfirm,
}: {
  title: string;
  confirmLabel: string;
  pending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Dialog
      open
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            Hủy
          </Button>
          <Button size="sm" disabled={pending || !reason.trim()} onClick={() => onConfirm(reason.trim())}>
            {pending ? "Đang lưu..." : confirmLabel}
          </Button>
        </>
      }
    >
      <Field label="Lý do (ghi vào nhật ký)">
        {(id) => (
          <input
            id={id}
            value={reason}
            maxLength={300}
            onChange={(event) => setReason(event.target.value)}
            className={fieldClass}
          />
        )}
      </Field>
    </Dialog>
  );
}

function DeleteDialog({
  player,
  pending,
  onClose,
  run,
}: {
  player: AdminPlayer;
  pending: boolean;
  onClose: () => void;
  run: Runner;
}) {
  const [typed, setTyped] = useState("");
  const [reason, setReason] = useState("");
  const confirmText = player.email ?? player.id;
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Xóa tài khoản ${player.username ?? player.email}?`}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            Hủy
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={pending || typed.trim() !== confirmText || !reason.trim()}
            onClick={() => run(() => deletePlayer(player.id, { reason: reason.trim() }))}
          >
            <FaIcon icon={faTrashCan} />
            {pending ? "Đang xóa..." : "Xóa vĩnh viễn"}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-slate-700">
        <p>
          Thao tác <strong>không hoàn tác được</strong>: xóa tài khoản đăng nhập và hồ sơ người chơi. Nếu chỉ
          muốn tạm chặn, hãy <strong>khóa</strong> tài khoản.
        </p>
        <Field label="Lý do (ghi vào nhật ký)">
          {(id) => (
            <input
              id={id}
              value={reason}
              maxLength={300}
              onChange={(e) => setReason(e.target.value)}
              className={fieldClass}
            />
          )}
        </Field>
        <Field label={`Gõ "${confirmText}" để xác nhận`}>
          {(id) => (
            <input
              id={id}
              value={typed}
              autoComplete="off"
              onChange={(e) => setTyped(e.target.value)}
              className={`${fieldClass} font-mono`}
            />
          )}
        </Field>
      </div>
    </Dialog>
  );
}
