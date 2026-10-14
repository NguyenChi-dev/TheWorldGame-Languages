"use client";

import { faArrowDown, faArrowUp, faGripVertical } from "@fortawesome/free-solid-svg-icons";
import { useState, type ReactNode } from "react";
import { FaIcon } from "@/components/fa-icon";

/** Nút điều khiển thứ tự, truyền cho renderItem (dạng lưới tự đặt các nút này vào thẻ). */
export interface SortControls {
  /** Biểu tượng kéo (grip). */
  handle: ReactNode;
  moveBack: () => void;
  moveForward: () => void;
  canMoveBack: boolean;
  canMoveForward: boolean;
}

/**
 * Danh sách đổi thứ tự bằng kéo thả (HTML5 drag & drop, không cần thư viện) và nút cho bàn phím.
 * - variant "list": mỗi mục một dòng, tự vẽ nút kéo và ↑ ↓ ở đầu dòng.
 * - variant "grid": lưới thẻ; renderItem nhận `controls` để tự đặt nút trong thẻ.
 * Đổi xong gọi onReorder(danh sách mới). Trả về false (máy chủ từ chối) thì danh sách quay về như cũ.
 */
export function SortableList<T>({
  items,
  getId,
  onReorder,
  renderItem,
  disabled,
  variant = "list",
  trailing,
}: {
  items: T[];
  getId: (item: T) => string;
  onReorder: (next: T[]) => Promise<boolean>;
  renderItem: (item: T, index: number, controls: SortControls) => ReactNode;
  disabled?: boolean;
  variant?: "list" | "grid";
  /** Phần tử thêm vào cuối danh sách, không kéo được (ví dụ thẻ "Thêm mới"). */
  trailing?: ReactNode;
}) {
  const [list, setList] = useState(items);
  const [source, setSource] = useState(items);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // Dữ liệu mới từ máy chủ (sau khi lưu / tải lại) thay cho danh sách tạm
  // (cập nhật ngay khi render, theo cách React khuyến nghị thay cho useEffect).
  if (items !== source) {
    setSource(items);
    setList(items);
  }

  async function commit(next: T[]) {
    const previous = list;
    setList(next);
    if (!(await onReorder(next))) setList(previous);
  }

  function move(from: number, to: number) {
    if (from === to || to < 0 || to >= list.length) return;
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    void commit(next);
  }

  const grid = variant === "grid";

  return (
    <ul className={grid ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "divide-y divide-secondary"}>
      {list.map((item, index) => {
        const handle = (
          <span
            aria-hidden="true"
            title="Kéo để đổi thứ tự"
            className="cursor-grab select-none px-1 text-sm active:cursor-grabbing"
          >
            <FaIcon icon={faGripVertical} />
          </span>
        );
        const controls: SortControls = {
          handle,
          moveBack: () => move(index, index - 1),
          moveForward: () => move(index, index + 1),
          canMoveBack: !disabled && index > 0,
          canMoveForward: !disabled && index < list.length - 1,
        };
        const dragging = dragIndex === index;
        const over = overIndex === index && dragIndex !== index;
        return (
          <li
            key={getId(item)}
            draggable={!disabled}
            onDragStart={(event) => {
              setDragIndex(index);
              event.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(event) => {
              if (dragIndex === null) return;
              event.preventDefault();
              setOverIndex(index);
            }}
            onDragLeave={() => setOverIndex((current) => (current === index ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              if (dragIndex !== null) move(dragIndex, index);
              setDragIndex(null);
              setOverIndex(null);
            }}
            onDragEnd={() => {
              setDragIndex(null);
              setOverIndex(null);
            }}
            className={
              grid
                ? `rounded-2xl transition ${dragging ? "opacity-40" : ""} ${over ? "ring-2 ring-primary ring-offset-2" : ""}`
                : `flex items-center gap-2 py-2 transition-colors ${dragging ? "opacity-40" : ""} ${
                    over ? "bg-secondary/60" : ""
                  }`
            }
          >
            {grid ? (
              renderItem(item, index, controls)
            ) : (
              <>
                <span className="flex shrink-0 items-center gap-0.5 text-slate-400">
                  {handle}
                  <button
                    type="button"
                    aria-label="Đưa lên"
                    disabled={!controls.canMoveBack}
                    onClick={controls.moveBack}
                    className="rounded px-1 text-xs hover:bg-secondary hover:text-accent disabled:invisible"
                  >
                    <FaIcon icon={faArrowUp} />
                  </button>
                  <button
                    type="button"
                    aria-label="Đưa xuống"
                    disabled={!controls.canMoveForward}
                    onClick={controls.moveForward}
                    className="rounded px-1 text-xs hover:bg-secondary hover:text-accent disabled:invisible"
                  >
                    <FaIcon icon={faArrowDown} />
                  </button>
                </span>
                <div className="min-w-0 flex-1">{renderItem(item, index, controls)}</div>
              </>
            )}
          </li>
        );
      })}
      {trailing ? <li>{trailing}</li> : null}
    </ul>
  );
}
