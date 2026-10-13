"use client";

import { useState, type ReactNode } from "react";

/**
 * Danh sách đổi thứ tự bằng kéo thả (HTML5 drag & drop, không cần thư viện) và nút ↑ ↓ cho bàn phím.
 * Đổi xong gọi onReorder(danh sách mới). Trả về false (máy chủ từ chối) thì danh sách quay về như cũ.
 */
export function SortableList<T>({
  items,
  getId,
  onReorder,
  renderItem,
  disabled,
}: {
  items: T[];
  getId: (item: T) => string;
  onReorder: (next: T[]) => Promise<boolean>;
  renderItem: (item: T, index: number) => ReactNode;
  disabled?: boolean;
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

  return (
    <ul className="divide-y divide-secondary">
      {list.map((item, index) => (
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
          className={`flex items-center gap-2 py-2 transition-colors ${dragIndex === index ? "opacity-40" : ""} ${
            overIndex === index && dragIndex !== index ? "bg-secondary/60" : ""
          }`}
        >
          <span className="flex shrink-0 items-center gap-0.5 text-slate-400">
            <span
              aria-hidden="true"
              title="Kéo để đổi thứ tự"
              className="cursor-grab px-1 text-base leading-none"
            >
              ⠿
            </span>
            <button
              type="button"
              aria-label="Đưa lên"
              disabled={disabled || index === 0}
              onClick={() => move(index, index - 1)}
              className="rounded px-1 text-xs hover:bg-secondary hover:text-accent disabled:invisible"
            >
              ↑
            </button>
            <button
              type="button"
              aria-label="Đưa xuống"
              disabled={disabled || index === list.length - 1}
              onClick={() => move(index, index + 1)}
              className="rounded px-1 text-xs hover:bg-secondary hover:text-accent disabled:invisible"
            >
              ↓
            </button>
          </span>
          <div className="min-w-0 flex-1">{renderItem(item, index)}</div>
        </li>
      ))}
    </ul>
  );
}
