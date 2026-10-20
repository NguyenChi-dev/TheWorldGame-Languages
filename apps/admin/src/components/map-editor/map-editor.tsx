"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  faArrowDown,
  faArrowLeft,
  faArrowPointer,
  faArrowsUpDownLeftRight,
  faCheck,
  faChevronDown,
  faCopy,
  faCube,
  faDice,
  faDownload,
  faExpand,
  faEye,
  faEyeSlash,
  faFileImport,
  faFlag,
  faGrip,
  faKeyboard,
  faLayerGroup,
  faLock,
  faMagnifyingGlass,
  faPaintbrush,
  faPaste,
  faPlus,
  faRotate,
  faRotateLeft,
  faRotateRight,
  faShapes,
  faSliders,
  faTableColumns,
  faTrash,
  faUnlock,
  faUpRightAndDownLeftFromCenter,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import {
  renderModelThumbnail,
  startMapEditor,
  type EditorTool,
  type MapEditorHandle,
  type ModelStatus,
} from "@lw/game/editor";
import {
  emptyMap,
  MAX_LAYOUT_BYTES,
  MAX_MAP_OBJECTS,
  PREFABS,
  readMapJson,
  SPAWN_ID,
  writeMapJson,
  type MapObject,
  type MapVector,
} from "@lw/shared/map-layout";
import { FaIcon } from "@/components/fa-icon";
import { createEditorStore } from "./editor-store";
import { NumberField, TextField, VectorFields } from "./editor-fields";
import { modelItem, PREFAB_ITEMS, PRIMITIVE_ITEMS, type BaseObject, type LibraryItem } from "./library";
import {
  inspectGlb,
  loadThumbnail,
  modelNameError,
  resolveModelSource,
  saveThumbnail,
  restoreModels,
  restoreProjectModels,
  saveModel,
  saveProjectModel,
  type LocalModel,
} from "./local-assets";
import "./map-editor.css";

const TOOLS = [
  { key: "move", label: "Di chuyển", shortcut: "W", icon: faArrowsUpDownLeftRight },
  { key: "rotate", label: "Xoay", shortcut: "E", icon: faRotate },
  { key: "scale", label: "Kích thước", shortcut: "R", icon: faUpRightAndDownLeftFromCenter },
] as const;
const STATUS: Record<ModelStatus, string> = {
  loading: "Đang tải mô hình",
  ready: "Sẵn sàng",
  missing: "Cần chọn lại file GLB",
  error: "Không đọc được GLB — chọn lại file",
};
/** Bảng màu nhanh trong bảng thuộc tính. */
const SWATCHES = [
  "#4fae45",
  "#3e8f39",
  "#f3e6c8",
  "#c4563f",
  "#cc4630",
  "#2f5cb0",
  "#3d9fd9",
  "#f0b93a",
  "#e9c98f",
  "#9a8f84",
  "#f26d8f",
  "#1d1d1f",
];

const baseObject = (name: string, position: MapVector = { x: 0, y: 0, z: 0 }): BaseObject => ({
  id: crypto.randomUUID(),
  name,
  position,
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
  visible: true,
  locked: false,
});
const round = (value: number, step = 0.001) => Number((Math.round(value / step) * step).toFixed(3));
const kindLabel = (object: MapObject) =>
  object.kind === "glb" ? "MÔ HÌNH GLB" : object.kind === "prefab" ? "MẪU LOW-POLY" : "KHỐI CƠ BẢN";

function downloadJson(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Màu chủ đạo + icon của một vật thể trong danh sách lớp. */
function objectBadge(object: MapObject) {
  if (object.kind === "glb") return { color: "#f0a1ca", icon: faCube };
  const item = [...PREFAB_ITEMS, ...PRIMITIVE_ITEMS].find((entry) =>
    object.kind === "prefab"
      ? entry.id === `prefab:${object.prefab}`
      : entry.id === `primitive:${object.kind}`,
  );
  return { color: object.color, icon: item?.icon ?? faCube };
}

/** File đang chờ đặt tên trong hộp thoại import. */
interface PendingModel {
  key: string;
  file: File;
  name: string;
  thumb?: Blob;
  thumbUrl?: string;
  thumbFailed?: boolean;
}
const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
const modelSource = (item: LibraryItem) => item.id.slice("model:".length);
const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export default function MapEditor({
  storageKey,
  projectModels = false,
}: {
  storageKey: string;
  /** Dev: GLB import được ghi vào apps/web/public/models/ và tự mở lại từ đó. */
  projectModels?: boolean;
}) {
  const [store] = useState(createEditorStore);
  const { layout, selectedId, past, future } = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editorRef = useRef<MapEditorHandle | null>(null);
  const glbInput = useRef<HTMLInputElement>(null);
  const jsonInput = useRef<HTMLInputElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [models, setModels] = useState<ReadonlyMap<string, File>>(() => new Map());
  /** Ảnh minh họa (data URL) theo đường dẫn mô hình. */
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const thumbRequests = useRef(new Set<string>());
  const [pending, setPending] = useState<PendingModel[] | null>(null);
  const [statuses, setStatuses] = useState<Record<string, ModelStatus>>({});
  const [tool, setTool] = useState<EditorTool>("move");
  const [snap, setSnap] = useState(true);
  const [grid, setGrid] = useState(true);
  const [gridStep, setGridStep] = useState(1);
  const [showLibrary, setShowLibrary] = useState(true);
  const [showInspector, setShowInspector] = useState(true);
  const [leftTab, setLeftTab] = useState<"library" | "layers">("library");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [viewportError, setViewportError] = useState("");
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState("Đang mở bản nháp…");
  const [search, setSearch] = useState("");
  const [librarySearch, setLibrarySearch] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [cursor, setCursor] = useState<MapVector | null>(null);
  const cursorRef = useRef<MapVector | null>(null);
  const [clipboard, setClipboard] = useState<MapObject | null>(null);
  // Chế độ đặt vật thể (chọn mẫu trong thư viện rồi bấm xuống bản đồ).
  const [placingItem, setPlacingItem] = useState<LibraryItem | null>(null);
  const [placeColor, setPlaceColor] = useState<string | null>(null);
  const [brush, setBrush] = useState(false);
  const [spacing, setSpacing] = useState(2.5);
  const [randomRotate, setRandomRotate] = useState(true);
  const [randomScale, setRandomScale] = useState(true);
  const selected = layout.objects.find((object) => object.id === selectedId);
  const isSpawn = selectedId === SPAWN_ID;

  const libraryItems = useMemo(
    // Thư viện chỉ gồm các file GLB người dùng cung cấp (không dùng mẫu demo dựng sẵn).
    () => Array.from(models).map(([source, file]) => modelItem(source, file)),
    [models],
  );
  const visibleItems = libraryItems.filter((item) =>
    item.name.toLocaleLowerCase().includes(librarySearch.toLocaleLowerCase()),
  );

  // Recover the JSON and local files before enabling edits. A broken draft is never overwritten on load.
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      const messages: string[] = [];
      try {
        const text = localStorage.getItem(storageKey);
        if (text && !cancelled) store.restore(readMapJson(text));
      } catch {
        messages.push("Không đọc được bản nháp. Bạn vẫn có thể nhập file JSON đã xuất.");
      }
      try {
        const files: LocalModel[] = await restoreModels(storageKey).catch((error: unknown) => {
          if (!projectModels) throw error;
          return [];
        });
        // Dev: bổ sung các GLB đã lưu trong apps/web/public/models/ (mở được ở mọi trình duyệt trên máy này).
        if (projectModels) {
          const known = new Set(files.map((file) => file.source));
          try {
            files.push(...(await restoreProjectModels(known)));
          } catch {
            messages.push("Không đọc được thư mục mô hình của dự án.");
          }
        }
        if (!cancelled) setModels(new Map(files.map(({ source, file }) => [source, file])));
      } catch {
        messages.push("Bộ nhớ GLB không khả dụng. Hãy chọn lại mô hình sau khi tải lại trang.");
      }
      if (cancelled) return;
      setNotice(messages.join(" "));
      setSaved("Lưu nháp trên thiết bị này");
      setReady(true);
    }
    void restore();
    return () => {
      cancelled = true;
    };
  }, [storageKey, store, projectModels]);

  useEffect(() => {
    if (!ready) return;
    let previous = store.getSnapshot().layout;
    let dirty = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      if (!dirty) return;
      try {
        localStorage.setItem(storageKey, writeMapJson(store.getSnapshot().layout));
        dirty = false;
        setSaved("Đã lưu nháp trên thiết bị");
      } catch {
        setSaved("Chưa lưu được — hãy xuất JSON");
      }
    };
    const unsubscribe = store.subscribe(() => {
      const next = store.getSnapshot().layout;
      if (next === previous) return;
      previous = next;
      dirty = true;
      setSaved("Đang lưu…");
      clearTimeout(timer);
      timer = setTimeout(flush, 400);
    });
    const beforeUnload = (event: BeforeUnloadEvent) => {
      flush();
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      clearTimeout(timer);
      flush();
      unsubscribe();
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [ready, storageKey, store]);

  // Gọi qua ref để engine 3D (dựng một lần) luôn dùng cài đặt đặt vật thể mới nhất.
  const placeRef = useRef<(point: MapVector) => void>(() => {});
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const editor = startMapEditor(canvas, {
        onSelect: (id) => store.select(id),
        onTransform: (id, transform) => store.transform(id, transform),
        onModelStatus: (id, status) =>
          setStatuses((current) => (current[id] === status ? current : { ...current, [id]: status })),
        onGridStepChange: setGridStep,
        onPlace: (point) => placeRef.current(point),
        onPointerGround: (point) => {
          cursorRef.current = point;
          setCursor(point);
        },
      });
      editorRef.current = editor;
      return () => {
        editorRef.current = null;
        editor.dispose();
      };
    } catch (error) {
      console.error("[map-editor] WebGL", error);
      // Report outside the effect's synchronous setup; the rest of the editor remains exportable.
      queueMicrotask(() =>
        setViewportError(
          "Không khởi tạo được WebGL. Hãy bật tăng tốc đồ họa trong trình duyệt rồi tải lại trang.",
        ),
      );
    }
  }, [store]);

  useEffect(() => {
    editorRef.current?.setModels(models);
  }, [models]);
  useEffect(() => {
    for (const [source, file] of models) {
      const request = `${source}|${file.size}|${file.lastModified}`;
      if (thumbRequests.current.has(request)) continue;
      thumbRequests.current.add(request);
      void (async () => {
        const model = { source, file };
        let blob = await loadThumbnail(storageKey, model).catch(() => null);
        if (!blob) {
          blob = await renderModelThumbnail(file).catch(() => null);
          if (blob) void saveThumbnail(storageKey, model, blob).catch(() => {});
        }
        if (!blob) return;
        const url = await blobToDataUrl(blob);
        setThumbs((current) => ({ ...current, [source]: url }));
      })();
    }
  }, [models, storageKey]);
  useEffect(() => {
    editorRef.current?.setLayout(layout);
  }, [layout]);
  useEffect(() => {
    editorRef.current?.select(selectedId);
  }, [selectedId]);
  useEffect(() => {
    editorRef.current?.setTool(tool, snap);
  }, [tool, snap]);
  useEffect(() => {
    editorRef.current?.setGrid(grid);
  }, [grid]);
  useEffect(() => {
    if (ready) editorRef.current?.frameAll();
  }, [ready]);
  useEffect(() => {
    editorRef.current?.setPlacing(placingItem ? { brush, spacing } : null);
  }, [placingItem, brush, spacing]);

  /** Đặt vật thể đang chọn trong thư viện tại `point` (xoay / kích thước ngẫu nhiên nếu bật). */
  useEffect(() => {
    placeRef.current = (point) => {
      if (!placingItem) return;
      if (store.getSnapshot().layout.objects.length >= MAX_MAP_OBJECTS) {
        setNotice(`Mỗi bản đồ tối đa ${MAX_MAP_OBJECTS} vật thể.`);
        return;
      }
      const base = baseObject(placingItem.name, point);
      if (randomRotate) base.rotation = { x: 0, y: round(Math.random() * 360, 1), z: 0 };
      if (randomScale) {
        const s = round(0.8 + Math.random() * 0.4, 0.01);
        base.scale = { x: s, y: s, z: s };
      }
      store.add([placingItem.create(base, placeColor ?? placingItem.color)]);
    };
  }, [placingItem, placeColor, randomRotate, randomScale, store]);

  const choosePlacing = (item: LibraryItem | null) => {
    setPlacingItem(item);
    setPlaceColor(item?.color ?? null);
    if (item) {
      setSpacing(item.spacing);
      // Đường lát / rào cần thẳng hàng: tắt xoay và kích thước ngẫu nhiên.
      const tidy = item.id === "prefab:path" || item.id === "prefab:fence";
      setRandomRotate(!tidy && item.group !== "primitive" && item.group !== "model");
      setRandomScale(!tidy && (item.group === "nature" || item.id === "prefab:barrel"));
    }
  };

  const exportJson = useCallback(() => {
    try {
      const map = store.getSnapshot().layout;
      const filename =
        map.name
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .replace(/đ/gi, "d")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "map";
      downloadJson(writeMapJson(map), `${filename}.json`);
      setNotice("Đã xuất JSON. Giữ các file GLB gốc cùng bố cục để dùng trên máy khác.");
    } catch {
      setNotice("Không xuất được bố cục. Hãy kiểm tra các giá trị của vật thể.");
    }
  }, [store]);

  const copySelected = useCallback(() => {
    const object = store
      .getSnapshot()
      .layout.objects.find((item) => item.id === store.getSnapshot().selectedId);
    if (!object) return;
    setClipboard(object);
    setNotice(`Đã sao chép “${object.name}”. Ctrl+V để dán (tại vị trí con trỏ nếu đang ở trong bản đồ).`);
  }, [store]);
  const paste = useCallback(() => {
    if (!clipboard) return;
    if (store.getSnapshot().layout.objects.length >= MAX_MAP_OBJECTS) return;
    const at = cursorRef.current;
    store.add([
      {
        ...clipboard,
        id: crypto.randomUUID(),
        locked: false,
        position: at
          ? { ...at, y: clipboard.position.y }
          : { ...clipboard.position, x: clipboard.position.x + 2, z: clipboard.position.z + 2 },
      },
    ]);
  }, [clipboard, store]);

  /** Dịch / xoay vật thể đang chọn bằng bàn phím. */
  const nudge = useCallback(
    (dx: number, dz: number, dy = 0, turn = 0) => {
      const { layout: current, selectedId: id } = store.getSnapshot();
      if (id === SPAWN_ID) {
        store.commit({
          ...current,
          spawn: {
            x: round(current.spawn.x + dx),
            y: Math.max(-10000, round(current.spawn.y + dy)),
            z: round(current.spawn.z + dz),
          },
        });
        return;
      }
      const object = current.objects.find((item) => item.id === id);
      if (!object || object.locked) return;
      store.updateObject(object.id, (item) => ({
        ...item,
        position: {
          x: round(item.position.x + dx),
          y: round(item.position.y + dy),
          z: round(item.position.z + dz),
        },
        rotation: { ...item.rotation, y: round((((item.rotation.y + turn) % 360) + 360) % 360, 0.01) },
      }));
    },
    [store],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        !ready ||
        busy ||
        pending ||
        (target instanceof HTMLElement &&
          (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)))
      )
        return;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      const step = (snap ? 0.5 : 0.1) * (event.shiftKey ? 4 : 1);
      if (mod && key === "s") {
        event.preventDefault();
        exportJson();
      } else if (mod && key === "z") {
        event.preventDefault();
        if (event.shiftKey) store.redo();
        else store.undo();
      } else if (mod && key === "y") {
        event.preventDefault();
        store.redo();
      } else if (mod && key === "d") {
        event.preventDefault();
        if (store.getSnapshot().layout.objects.length < MAX_MAP_OBJECTS) store.duplicate();
      } else if (mod && key === "c") {
        copySelected();
      } else if (mod && key === "v") {
        event.preventDefault();
        paste();
      } else if (!mod && !event.altKey) {
        if (key === "escape") {
          if (placingItem) choosePlacing(null);
          else store.select(null);
          return;
        }
        if (key === "w") setTool("move");
        if (key === "e") setTool("rotate");
        if (key === "r") setTool("scale");
        if (key === "q") choosePlacing(null);
        if (key === "f") editorRef.current?.focus();
        if (key === "g") editorRef.current?.dropToSurface();
        if (key === "home") {
          event.preventDefault();
          editorRef.current?.frameAll();
        }
        if (key === "delete" || key === "backspace") {
          event.preventDefault();
          store.remove();
        }
        const arrows: Record<string, [number, number]> = {
          arrowleft: [-step, 0],
          arrowright: [step, 0],
          arrowup: [0, step],
          arrowdown: [0, -step],
        };
        if (key in arrows && store.getSnapshot().selectedId) {
          event.preventDefault();
          nudge(...arrows[key]);
        }
        if (key === "pageup" || key === "pagedown") {
          event.preventDefault();
          nudge(0, 0, key === "pageup" ? step : -step);
        }
        if (key === "[" || key === "]") nudge(0, 0, 0, key === "]" ? 15 : -15);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, busy, pending, store, exportJson, copySelected, paste, nudge, placingItem, snap]);

  /** Bước 1: kiểm tra file, mở hộp thoại đặt tên và dựng ảnh minh họa. */
  const importModels = async (files: File[]) => {
    if (!ready || busy || pending || !files.length) return;
    const errors: string[] = [];
    const accepted: PendingModel[] = [];
    for (const file of files) {
      try {
        await inspectGlb(file);
        accepted.push({
          key: crypto.randomUUID(),
          file,
          name: file.name.replace(/\.glb$/i, "").slice(0, 100),
        });
      } catch (error) {
        errors.push((error as Error).message);
      }
    }
    if (errors.length) setNotice(errors.join(" "));
    if (!accepted.length) return;
    setPending(accepted);
    for (const item of accepted) {
      void renderModelThumbnail(item.file)
        .then(async (blob) => ({ blob, url: blob ? await blobToDataUrl(blob) : undefined }))
        .catch(() => ({ blob: null, url: undefined }))
        .then(({ blob, url }) =>
          setPending((current) =>
            current
              ? current.map((entry) =>
                  entry.key === item.key
                    ? { ...entry, thumb: blob ?? undefined, thumbUrl: url, thumbFailed: !blob }
                    : entry,
                )
              : current,
          ),
        );
    }
  };
  const pendingErrors = (pending ?? []).map((item, index, list) => {
    const error = modelNameError(item.name);
    if (error) return error;
    const name = item.name.trim().toLocaleLowerCase();
    return list.some((other, i) => i < index && other.name.trim().toLocaleLowerCase() === name)
      ? "Trùng tên với file khác trong lần thêm này"
      : null;
  });
  const existingNames = new Set(Array.from(models.values(), (file) => file.name.toLocaleLowerCase()));
  /** Bước 2: đổi tên file theo tên đã đặt rồi đưa vào thư viện (và thư mục dự án khi dev). */
  const confirmImport = () => {
    if (!pending || pendingErrors.some(Boolean)) return;
    const items = pending.map((item) => ({
      file: new File([item.file], `${item.name.trim()}.glb`, {
        type: "model/gltf-binary",
        lastModified: item.file.lastModified,
      }),
      thumb: item.thumb,
    }));
    setPending(null);
    void addModels(items);
  };

  const addModels = async (items: { file: File; thumb?: Blob }[]) => {
    if (!items.length) return;
    setBusy(true);
    const errors: string[] = [];
    const next = new Map(models);
    const additions: MapObject[] = [];
    const savedPaths: string[] = [];
    try {
      for (const { file, thumb } of items) {
        try {
          const asset = await inspectGlb(file);
          // Re-selecting the same model reconnects missing references without adding duplicates.
          // Trùng tên đã được báo trong hộp thoại import: thay mô hình cũ.
          asset.source = resolveModelSource(asset, store.getSnapshot().layout);
          next.set(asset.source, asset.file);
          if (thumb) {
            void saveThumbnail(storageKey, asset, thumb).catch(() => {});
            const url = await blobToDataUrl(thumb);
            thumbRequests.current.add(`${asset.source}|${asset.file.size}|${asset.file.lastModified}`);
            setThumbs((current) => ({ ...current, [asset.source]: url }));
          }
          try {
            await saveModel(storageKey, asset);
          } catch {
            if (!projectModels) errors.push(`${file.name}: chỉ giữ được trong phiên này, hãy giữ file gốc.`);
          }
          if (projectModels) {
            try {
              savedPaths.push(await saveProjectModel(asset.file));
            } catch (error) {
              errors.push(`${file.name}: chưa lưu được vào dự án (${(error as Error).message}).`);
            }
          }
          if (
            !store
              .getSnapshot()
              .layout.objects.some((object) => object.kind === "glb" && object.source === asset.source) &&
            !additions.some((object) => object.kind === "glb" && object.source === asset.source) &&
            store.getSnapshot().layout.objects.length + additions.length < MAX_MAP_OBJECTS
          ) {
            additions.push(
              modelItem(asset.source, asset.file).create(
                baseObject(file.name.replace(/\.glb$/i, ""), { x: additions.length * 3, y: 0, z: 0 }),
                null,
              ),
            );
          }
        } catch (error) {
          errors.push((error as Error).message);
        }
      }
      setModels(next);
      if (additions.length) store.add(additions);
      setNotice(
        errors.length
          ? errors.join(" ")
          : savedPaths.length
            ? `Đã lưu vào dự án: ${savedPaths.join(", ")}. Chọn mô hình trong thư viện rồi bấm xuống bản đồ để đặt thêm.`
            : "Đã thêm GLB vào thư viện. Chọn mô hình trong thư viện rồi bấm xuống bản đồ để đặt thêm.",
      );
    } finally {
      setBusy(false);
    }
  };
  const importJson = async (file: File) => {
    if (file.size > MAX_LAYOUT_BYTES) {
      setNotice("File JSON tối đa 2 MB.");
      return;
    }
    setBusy(true);
    try {
      const next = readMapJson(await file.text());
      if (!window.confirm(`Mở “${next.name}” thay bố cục hiện tại? Bạn có thể Hoàn tác để quay lại.`)) return;
      store.commit(next);
      store.select(null);
      const missing = new Set(
        next.objects
          .filter((object) => object.kind === "glb" && !models.has(object.source))
          .map((object) => (object.kind === "glb" ? object.source : "")),
      );
      setNotice(
        missing.size
          ? `Đã mở bản đồ. Cần chọn lại ${missing.size} file GLB; khung màu hồng đánh dấu mô hình còn thiếu.`
          : "Đã mở bản đồ từ JSON.",
      );
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const updateSelected = (update: (object: MapObject) => MapObject) => {
    if (selected) store.updateObject(selected.id, update);
  };
  const rotateSelected = (degrees: number) =>
    updateSelected((object) => ({
      ...object,
      rotation: { ...object.rotation, y: round((((object.rotation.y + degrees) % 360) + 360) % 360, 0.01) },
    }));
  const list = layout.objects.filter((object) =>
    object.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  const unavailable = layout.objects.filter(
    (object) =>
      object.kind === "glb" && (statuses[object.id] === "missing" || statuses[object.id] === "error"),
  );

  return (
    <div
      ref={shellRef}
      className={`map-editor ${showLibrary ? "" : "library-hidden"} ${showInspector ? "" : "inspector-hidden"}`}
    >
      <header className="me-header">
        <Link href="/lands" className="me-back" title="Về trang quản trị">
          <FaIcon icon={faArrowLeft} />
        </Link>
        <div className="me-brand">
          <span className="me-logo">
            <FaIcon icon={faCube} />
          </span>
          <div>
            <strong>World Studio</strong>
            <span>THIẾT KẾ BẢN ĐỒ 3D</span>
          </div>
        </div>
        <div className="me-document">
          <span className="me-dot" />
          <span className="me-document-name">{layout.name}</span>
          <small>{saved}</small>
        </div>
        <div className="me-header-actions">
          <button
            disabled={!ready || busy}
            onClick={() => {
              if (window.confirm("Tạo bản đồ trống? Bố cục hiện tại vẫn có thể Hoàn tác.")) {
                store.commit(emptyMap());
                store.select(null);
              }
            }}
          >
            <FaIcon icon={faPlus} />
            <span>Tạo mới</span>
          </button>
          <button disabled={!ready || busy} onClick={() => jsonInput.current?.click()}>
            <FaIcon icon={faFileImport} />
            <span>Nhập JSON</span>
          </button>
          <button className="me-primary" disabled={!ready || busy} onClick={exportJson}>
            <FaIcon icon={faDownload} />
            <span>Xuất JSON</span>
          </button>
        </div>
      </header>

      <div className="me-toolbar" role="toolbar" aria-label="Công cụ chỉnh sửa">
        <div className="me-tool-group me-panel-toggles">
          <button
            aria-label={showLibrary ? "Thu gọn thư viện" : "Mở thư viện"}
            title="Ẩn/hiện thư viện vật thể"
            aria-pressed={showLibrary}
            aria-controls="editor-library"
            onClick={() => setShowLibrary(!showLibrary)}
          >
            <FaIcon icon={faTableColumns} />
          </button>
          <button
            aria-label={showInspector ? "Thu gọn thuộc tính" : "Mở thuộc tính"}
            title="Ẩn/hiện bảng thuộc tính"
            aria-pressed={showInspector}
            aria-controls="editor-inspector"
            onClick={() => setShowInspector(!showInspector)}
          >
            <FaIcon icon={faSliders} />
          </button>
        </div>
        <div className="me-tool-group me-segmented">
          <button
            className={!placingItem ? "active" : ""}
            aria-pressed={!placingItem}
            title="Chọn và chỉnh vật thể (Q)"
            onClick={() => choosePlacing(null)}
          >
            <FaIcon icon={faArrowPointer} />
            <span>Chọn</span>
            <kbd>Q</kbd>
          </button>
          {TOOLS.map((item) => (
            <button
              key={item.key}
              className={tool === item.key && !placingItem ? "active" : ""}
              aria-pressed={tool === item.key}
              title={`${item.label} (${item.shortcut})`}
              aria-label={item.label}
              onClick={() => {
                setTool(item.key);
                choosePlacing(null);
              }}
            >
              <FaIcon icon={item.icon} />
              <span>{item.label}</span>
              <kbd>{item.shortcut}</kbd>
            </button>
          ))}
        </div>
        <div className="me-tool-group">
          <button
            aria-label="Hoàn tác"
            title="Hoàn tác (Ctrl+Z)"
            disabled={!past.length || busy}
            onClick={() => store.undo()}
          >
            <FaIcon icon={faRotateLeft} />
          </button>
          <button
            aria-label="Làm lại"
            title="Làm lại (Ctrl+Shift+Z)"
            disabled={!future.length || busy}
            onClick={() => store.redo()}
          >
            <FaIcon icon={faRotateRight} />
          </button>
        </div>
        <div className="me-tool-group">
          <button
            className={snap ? "active" : ""}
            aria-pressed={snap}
            onClick={() => setSnap(!snap)}
            title="Di chuyển 0,5 m · xoay 15° · tỷ lệ 0,1 · đặt vật thể theo ô 0,5 m"
          >
            <FaIcon icon={faGrip} />
            <span>Bám lưới</span>
          </button>
          <button className={grid ? "active" : ""} aria-pressed={grid} onClick={() => setGrid(!grid)}>
            Lưới
          </button>
        </div>
        <span className="me-toolbar-end">
          {placingItem ? (
            <span className="me-placing-chip">
              <FaIcon icon={brush ? faPaintbrush : placingItem.icon} />
              {brush ? "Cọ rải" : "Đang đặt"}: <b>{placingItem.name}</b>
            </span>
          ) : (
            <>
              X <i /> Z <i /> <b>Y ↑ độ cao</b>
            </>
          )}
        </span>
      </div>

      {notice ? (
        <div role="status" className="me-notice">
          <span>{notice}</span>
          <button aria-label="Đóng thông báo" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      ) : null}

      <div className="me-workspace">
        <aside id="editor-library" className="me-library" hidden={!showLibrary}>
          <div className="me-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={leftTab === "library"}
              className={leftTab === "library" ? "active" : ""}
              onClick={() => setLeftTab("library")}
            >
              <FaIcon icon={faShapes} /> Thư viện
            </button>
            <button
              role="tab"
              aria-selected={leftTab === "layers"}
              className={leftTab === "layers" ? "active" : ""}
              onClick={() => setLeftTab("layers")}
            >
              <FaIcon icon={faLayerGroup} /> Lớp <span className="me-count">{layout.objects.length}</span>
            </button>
          </div>

          {leftTab === "library" ? (
            <section className="me-library-body">
              <label className="me-search-box">
                <FaIcon icon={faMagnifyingGlass} />
                <input
                  aria-label="Tìm mô hình"
                  placeholder="Tìm mô hình GLB…"
                  value={librarySearch}
                  onChange={(event) => setLibrarySearch(event.target.value)}
                />
              </label>
              <button
                className="me-add-model"
                disabled={!ready || busy}
                onClick={() => glbInput.current?.click()}
                title="Chọn file .glb từ máy (tối đa 50 MB/file)"
              >
                <FaIcon icon={faPlus} />
                {busy ? "Đang lưu…" : "Thêm GLB"}
              </button>
              {/* Mỗi mô hình một hàng: ảnh nhỏ + tên + dung lượng / số lần dùng trên bản đồ. */}
              <div className="me-model-list">
                {visibleItems.map((item) => {
                  const source = modelSource(item);
                  const file = models.get(source);
                  const used = layout.objects.filter(
                    (object) => object.kind === "glb" && object.source === source,
                  ).length;
                  const active = placingItem?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      className={`me-model-row ${active ? "active" : ""}`}
                      title={`${item.name} — bấm rồi bấm xuống bản đồ để đặt`}
                      aria-pressed={active}
                      disabled={!ready || busy}
                      onClick={() => choosePlacing(active ? null : item)}
                    >
                      <span className="me-model-thumb">
                        {thumbs[source] ? (
                          // eslint-disable-next-line @next/next/no-img-element -- ảnh data URL dựng tại chỗ
                          <img src={thumbs[source]} alt="" />
                        ) : (
                          <span className="me-thumb-loading">
                            <FaIcon icon={faCube} />
                          </span>
                        )}
                      </span>
                      <span className="me-model-text">
                        <span className="me-model-name">{item.name}</span>
                        <small>
                          {file ? formatSize(file.size) : ""}
                          {used ? ` · ${used} trên bản đồ` : ""}
                        </small>
                      </span>
                      {active ? <span className="me-model-badge">Đang đặt</span> : null}
                    </button>
                  );
                })}
              </div>
              {!libraryItems.length ? (
                <p className="me-muted">Chưa có mô hình. Bấm “Thêm GLB” hoặc kéo file .glb vào khung 3D.</p>
              ) : !visibleItems.length ? (
                <p className="me-muted">Không có mô hình khớp tìm kiếm.</p>
              ) : null}

              {placingItem ? (
                <div className="me-place-panel">
                  <div className="me-place-head">
                    <strong title={placingItem.name}>
                      <FaIcon icon={placingItem.icon} />
                      <span>{placingItem.name}</span>
                    </strong>
                    <button aria-label="Thôi đặt" title="Thôi đặt (Esc)" onClick={() => choosePlacing(null)}>
                      <FaIcon icon={faXmark} />
                    </button>
                  </div>
                  {placingItem.color ? (
                    <label className="me-color">
                      <span>Màu</span>
                      <input
                        type="color"
                        aria-label="Màu vật thể sẽ đặt"
                        value={placeColor ?? placingItem.color}
                        onChange={(event) => setPlaceColor(event.target.value)}
                      />
                    </label>
                  ) : null}
                  <label className="me-toggle">
                    <input
                      type="checkbox"
                      checked={randomRotate}
                      onChange={(e) => setRandomRotate(e.target.checked)}
                    />
                    <span>
                      <FaIcon icon={faDice} /> Xoay ngẫu nhiên
                    </span>
                  </label>
                  <label className="me-toggle">
                    <input
                      type="checkbox"
                      checked={randomScale}
                      onChange={(e) => setRandomScale(e.target.checked)}
                    />
                    <span>
                      <FaIcon icon={faDice} /> Kích thước ngẫu nhiên ±20%
                    </span>
                  </label>
                  <label className="me-toggle">
                    <input type="checkbox" checked={brush} onChange={(e) => setBrush(e.target.checked)} />
                    <span>
                      <FaIcon icon={faPaintbrush} /> Cọ rải (giữ chuột rê)
                    </span>
                  </label>
                  {brush ? (
                    <label className="me-range">
                      <span>Khoảng cách {spacing.toFixed(1)} m</span>
                      <input
                        type="range"
                        min={0.5}
                        max={10}
                        step={0.5}
                        value={spacing}
                        onChange={(event) => setSpacing(Number(event.target.value))}
                      />
                    </label>
                  ) : null}
                </div>
              ) : (
                <p className="me-tip">
                  <b>Mẹo:</b> chọn một mô hình rồi <b>bấm xuống bản đồ</b> để đặt thêm bản sao; bật{" "}
                  <b>Cọ rải</b> để rải nhiều bản sao bằng một nét kéo.
                </p>
              )}
            </section>
          ) : (
            <section className="me-outliner">
              <label className="me-search-box">
                <FaIcon icon={faMagnifyingGlass} />
                <input
                  aria-label="Tìm vật thể"
                  placeholder="Tìm vật thể…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <button
                className={`me-object ${isSpawn ? "selected" : ""}`}
                onClick={() => store.select(SPAWN_ID)}
              >
                <FaIcon icon={faFlag} />
                <span>Điểm xuất hiện</span>
              </button>
              <div className="me-object-list">
                {list.map((object) => {
                  const badge = objectBadge(object);
                  return (
                    <div
                      key={object.id}
                      className={`me-object-row ${selectedId === object.id ? "selected" : ""} ${!object.visible ? "dimmed" : ""}`}
                    >
                      <button
                        className="me-object-name"
                        onClick={() => store.select(object.id)}
                        onDoubleClick={() => {
                          store.select(object.id);
                          editorRef.current?.select(object.id);
                          editorRef.current?.focus();
                        }}
                      >
                        <span className="me-object-badge" style={{ color: badge.color }}>
                          <FaIcon icon={badge.icon} />
                        </span>
                        <span>{object.name}</span>
                        {object.kind === "glb" && statuses[object.id] !== "ready" ? (
                          <i className="me-warning-dot" title={STATUS[statuses[object.id] ?? "loading"]} />
                        ) : null}
                      </button>
                      <button
                        aria-label={`${object.visible ? "Ẩn" : "Hiện"} ${object.name}`}
                        title={object.visible ? "Ẩn vật thể" : "Hiện vật thể"}
                        onClick={() => store.updateObject(object.id, (o) => ({ ...o, visible: !o.visible }))}
                      >
                        <FaIcon icon={object.visible ? faEye : faEyeSlash} />
                      </button>
                      <button
                        aria-label={`${object.locked ? "Mở khóa" : "Khóa"} ${object.name}`}
                        title={object.locked ? "Mở khóa" : "Khóa chỉnh sửa"}
                        onClick={() => store.updateObject(object.id, (o) => ({ ...o, locked: !o.locked }))}
                      >
                        <FaIcon icon={object.locked ? faLock : faUnlock} />
                      </button>
                    </div>
                  );
                })}
              </div>
              {!layout.objects.length ? (
                <p className="me-muted">Bản đồ còn trống. Mở tab Thư viện để thêm vật thể.</p>
              ) : null}
            </section>
          )}
          <div className="me-local-note">
            <span className="me-dot" />
            <span>
              {projectModels ? (
                <>
                  GLB lưu vào <code>apps/web/public/models/</code>.
                  <br />
                  Bố cục: bản nháp trên trình duyệt, Xuất JSON để giữ.
                </>
              ) : (
                <>
                  Bản nháp ở trên thiết bị của bạn.
                  <br />
                  Xuất JSON để giữ một bản sao.
                </>
              )}
            </span>
          </div>
        </aside>

        <main
          className={`me-viewport ${dragOver ? "drag-over" : ""} ${placingItem ? "placing" : ""}`}
          aria-label="Khung thiết kế bản đồ 3D"
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes("Files")) {
              event.preventDefault();
              setDragOver(true);
            }
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            void importModels(Array.from(event.dataTransfer.files));
          }}
        >
          <canvas
            ref={canvasRef}
            tabIndex={0}
            aria-label="Bản đồ 3D: chuột trái chọn vật thể, chuột phải xoay góc nhìn"
          />
          <div className="me-viewport-top">
            <span>
              <span className="me-dot" /> 3D{" "}
              <i className="me-grid-scale">{grid ? `Lưới ${gridStep} m` : "Ẩn lưới"}</i>
            </span>
            <div>
              <button
                onClick={() => editorRef.current?.frameAll()}
                title="Vừa các vật thể vào khung nhìn (Home)"
              >
                <FaIcon icon={faExpand} /> Vừa cảnh
              </button>
              <button onClick={() => editorRef.current?.overview()} title="Xem toàn bản đồ">
                Toàn bản đồ
              </button>
              <button onClick={() => editorRef.current?.overview(true)}>Từ trên xuống</button>
              <button
                aria-label="Toàn màn hình"
                title="Toàn màn hình"
                onClick={() => {
                  const action = document.fullscreenElement
                    ? document.exitFullscreen()
                    : shellRef.current?.requestFullscreen();
                  void action?.catch(() => setNotice("Trình duyệt chưa hỗ trợ chế độ toàn màn hình."));
                }}
              >
                <FaIcon icon={faExpand} />
              </button>
            </div>
          </div>
          {!layout.objects.length && !viewportError && !placingItem ? (
            <div className="me-empty-hint">
              <FaIcon icon={faShapes} />
              <h2>Một thế giới, theo cách của bạn.</h2>
              <p>
                Thêm file GLB của bạn (hoặc kéo thả vào đây), rồi chọn mô hình trong thư viện và bấm xuống bản
                đồ.
              </p>
              <div className="me-empty-actions">
                <button disabled={!ready || busy} onClick={() => glbInput.current?.click()}>
                  <FaIcon icon={faFileImport} /> Chọn file GLB
                </button>
              </div>
            </div>
          ) : null}
          {placingItem ? (
            <div className="me-place-hint">
              <FaIcon icon={brush ? faPaintbrush : placingItem.icon} />
              <span>
                <b>{placingItem.name}</b> · {brush ? "giữ chuột trái rê để rải" : "bấm chuột trái để đặt"} ·
                chuột phải xoay góc nhìn · <kbd>Esc</kbd> thôi đặt
              </span>
            </div>
          ) : null}
          {dragOver ? (
            <div className="me-drop-overlay">
              <FaIcon icon={faCube} />
              Thả file GLB để thêm vào bản đồ
            </div>
          ) : null}
          {viewportError ? (
            <div className="me-drop-overlay" role="alert">
              {viewportError}
            </div>
          ) : null}
          {unavailable.length ? (
            <div className="me-missing">
              {unavailable.length} mô hình chưa tải được. Chọn lại file GLB có cùng tên bằng nút “Thêm GLB”.
            </div>
          ) : null}
          <div className="me-viewport-bottom">
            <span>
              Chọn: chuột trái · Nhìn gần: nhấp đúp / F · Vừa cảnh: Home
              <br />
              Chuột phải: xoay · Ctrl + chuột phải: kéo cảnh · Cuộn: zoom
            </span>
            <span className="me-axis">
              <b>X</b>
              <b>Y</b>
              <b>Z</b>
            </span>
          </div>
        </main>

        <aside id="editor-inspector" className="me-inspector" hidden={!showInspector}>
          <div className="me-section-title">
            <h2>Thuộc tính</h2>
            <FaIcon icon={faArrowPointer} />
          </div>
          {selected || isSpawn ? (
            <>
              <div className="me-ins-head">
                <span
                  className="me-ins-thumb"
                  style={selected && selected.kind !== "glb" ? { color: selected.color } : undefined}
                >
                  {selected?.kind === "glb" && thumbs[selected.source] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- ảnh data URL dựng tại chỗ
                    <img src={thumbs[selected.source]} alt="" />
                  ) : (
                    <FaIcon icon={isSpawn ? faFlag : selected ? objectBadge(selected).icon : faCube} />
                  )}
                </span>
                <div className="me-ins-title">
                  <small>
                    {isSpawn
                      ? "VỊ TRÍ BẮT ĐẦU"
                      : selected?.kind === "prefab"
                        ? `${kindLabel(selected)} · ${PREFABS[selected.prefab].name}`
                        : selected
                          ? kindLabel(selected)
                          : ""}
                  </small>
                  {selected ? (
                    <TextField
                      label="Tên vật thể"
                      value={selected.name}
                      disabled={selected.locked}
                      onChange={(name) => updateSelected((object) => ({ ...object, name }))}
                    />
                  ) : (
                    <strong>Điểm xuất hiện</strong>
                  )}
                </div>
              </div>
              {selected?.kind === "glb" ? (
                <div
                  className={`me-ins-file ${statuses[selected.id] === "ready" ? "ok" : ""}`}
                  title={`${projectModels ? "apps/web/public" : ""}${safeDecode(selected.source)}`}
                >
                  <i />
                  <code>{safeDecode(selected.source).split("/").at(-1)}</code>
                  <span>{STATUS[statuses[selected.id] ?? "loading"]}</span>
                </div>
              ) : null}
              {selected?.locked ? (
                <p className="me-ins-locked">
                  <FaIcon icon={faLock} /> Đang khóa — mở khóa trong tab Lớp để chỉnh.
                </p>
              ) : null}

              <section className="me-ins-group">
                <header>
                  <h3>
                    Vị trí <small>m</small>
                  </h3>
                  <button
                    className="me-icon-btn"
                    disabled={selected?.locked || (!selected?.visible && !isSpawn)}
                    onClick={() => editorRef.current?.dropToSurface()}
                    title="Đặt xuống bề mặt bên dưới (G)"
                    aria-label="Đặt xuống bề mặt"
                  >
                    <FaIcon icon={faArrowDown} />
                  </button>
                </header>
                <VectorFields
                  key={`${selectedId}-position`}
                  label="Vị trí"
                  value={isSpawn ? layout.spawn : selected!.position}
                  disabled={selected?.locked}
                  onChange={(position) =>
                    isSpawn
                      ? store.commit({ ...layout, spawn: position })
                      : updateSelected((object) => ({ ...object, position }))
                  }
                />
              </section>
              {selected ? (
                <>
                  <section className="me-ins-group">
                    <header>
                      <h3>
                        Góc xoay <small>độ</small>
                      </h3>
                      <div className="me-icon-row">
                        <button
                          className="me-icon-btn"
                          disabled={selected.locked}
                          onClick={() => rotateSelected(-90)}
                          title="Xoay trái 90° ( [ xoay 15° )"
                          aria-label="Xoay trái 90°"
                        >
                          <FaIcon icon={faRotateLeft} />
                        </button>
                        <button
                          className="me-icon-btn"
                          disabled={selected.locked}
                          onClick={() => rotateSelected(90)}
                          title="Xoay phải 90° ( ] xoay 15° )"
                          aria-label="Xoay phải 90°"
                        >
                          <FaIcon icon={faRotateRight} />
                        </button>
                        <button
                          className="me-icon-btn"
                          disabled={selected.locked}
                          title="Xoay ngẫu nhiên"
                          aria-label="Xoay ngẫu nhiên"
                          onClick={() =>
                            updateSelected((object) => ({
                              ...object,
                              rotation: { ...object.rotation, y: round(Math.random() * 360, 1) },
                            }))
                          }
                        >
                          <FaIcon icon={faDice} />
                        </button>
                        <button
                          className="me-icon-btn me-text-btn"
                          disabled={selected.locked}
                          title="Đặt lại góc xoay"
                          onClick={() =>
                            updateSelected((object) => ({ ...object, rotation: { x: 0, y: 0, z: 0 } }))
                          }
                        >
                          0°
                        </button>
                      </div>
                    </header>
                    <VectorFields
                      key={`${selectedId}-rotation`}
                      label="Góc xoay"
                      value={selected.rotation}
                      disabled={selected.locked}
                      onChange={(rotation) => updateSelected((object) => ({ ...object, rotation }))}
                    />
                  </section>
                  <section className="me-ins-group">
                    <header>
                      <h3>Tỷ lệ</h3>
                      <div className="me-segment" role="group" aria-label="Tỷ lệ đều">
                        {[0.5, 1, 1.5, 2].map((factor) => (
                          <button
                            key={factor}
                            disabled={selected.locked}
                            className={
                              selected.scale.x === factor &&
                              selected.scale.y === factor &&
                              selected.scale.z === factor
                                ? "active"
                                : ""
                            }
                            title={`Tỷ lệ đều ×${factor}`}
                            onClick={() =>
                              updateSelected((object) => ({
                                ...object,
                                scale: { x: factor, y: factor, z: factor },
                              }))
                            }
                          >
                            ×{String(factor).replace(".", ",")}
                          </button>
                        ))}
                      </div>
                    </header>
                    <VectorFields
                      key={`${selectedId}-scale`}
                      label="Tỷ lệ"
                      value={selected.scale}
                      scale
                      disabled={selected.locked}
                      onChange={(scale) => updateSelected((object) => ({ ...object, scale }))}
                    />
                  </section>
                  {selected.kind !== "glb" ? (
                    <section className="me-ins-group">
                      <header>
                        <h3>Màu sắc</h3>
                      </header>
                      <div className="me-swatches">
                        {SWATCHES.map((swatch) => (
                          <button
                            key={swatch}
                            aria-label={`Màu ${swatch}`}
                            className={selected.color.toLowerCase() === swatch ? "active" : ""}
                            style={{ background: swatch }}
                            disabled={selected.locked}
                            onClick={() =>
                              updateSelected((object) =>
                                object.kind === "glb" ? object : { ...object, color: swatch },
                              )
                            }
                          />
                        ))}
                        <input
                          aria-label="Màu vật thể"
                          type="color"
                          value={selected.color}
                          disabled={selected.locked}
                          onChange={(event) =>
                            updateSelected((object) =>
                              object.kind === "glb" ? object : { ...object, color: event.target.value },
                            )
                          }
                        />
                      </div>
                    </section>
                  ) : null}
                </>
              ) : null}
              <div className="me-ins-actions">
                <button onClick={() => editorRef.current?.focus()} title="Nhìn gần (F)">
                  <FaIcon icon={faExpand} />
                  <span>Nhìn gần</span>
                </button>
                {selected ? (
                  <>
                    <button
                      disabled={layout.objects.length >= MAX_MAP_OBJECTS}
                      onClick={() => store.duplicate()}
                      title="Nhân bản (Ctrl+D)"
                    >
                      <FaIcon icon={faCopy} />
                      <span>Nhân bản</span>
                    </button>
                    <button onClick={copySelected} title="Sao chép (Ctrl+C), dán bằng Ctrl+V">
                      <FaIcon icon={faPaste} />
                      <span>Sao chép</span>
                    </button>
                    <button
                      className="me-danger"
                      disabled={selected.locked}
                      onClick={() => store.remove()}
                      title="Xóa vật thể (Delete)"
                    >
                      <FaIcon icon={faTrash} />
                      <span>Xóa</span>
                    </button>
                  </>
                ) : null}
              </div>
              <details className="me-ins-keys">
                <summary>
                  <FaIcon icon={faKeyboard} /> Phím tắt
                </summary>
                <ul>
                  <li>
                    <kbd>←</kbd>
                    <kbd>→</kbd>
                    <kbd>↑</kbd>
                    <kbd>↓</kbd> dịch {snap ? "0,5" : "0,1"} m · <kbd>Shift</kbd> ×4
                  </li>
                  <li>
                    <kbd>PgUp</kbd>
                    <kbd>PgDn</kbd> nâng / hạ
                  </li>
                  <li>
                    <kbd>[</kbd>
                    <kbd>]</kbd> xoay 15° · <kbd>G</kbd> đặt xuống bề mặt
                  </li>
                  <li>
                    <kbd>F</kbd> nhìn gần · <kbd>Ctrl+D</kbd> nhân bản
                  </li>
                  <li>
                    <kbd>Ctrl+C</kbd> <kbd>Ctrl+V</kbd> sao chép / dán · <kbd>Del</kbd> xóa
                  </li>
                </ul>
              </details>
            </>
          ) : (
            <div className="me-inspector-empty">
              <FaIcon icon={faArrowPointer} />
              <p>Chọn một vật thể trong cảnh hoặc tab Lớp để chỉnh.</p>
              {clipboard ? (
                <button onClick={paste}>
                  <FaIcon icon={faPaste} /> Dán “{clipboard.name}” <kbd>Ctrl+V</kbd>
                </button>
              ) : null}
            </div>
          )}
          <details className="me-map-settings">
            <summary>
              Cài đặt bản đồ <FaIcon icon={faChevronDown} />
            </summary>
            <TextField
              label="Tên bản đồ"
              value={layout.name}
              onChange={(name) => store.commit({ ...layout, name })}
            />
            <div className="me-dimensions">
              <NumberField
                key={`width-${layout.ground.width}`}
                label="Rộng (m)"
                value={layout.ground.width}
                min={4}
                max={512}
                onChange={(width) => store.commit({ ...layout, ground: { ...layout.ground, width } })}
              />
              <NumberField
                key={`depth-${layout.ground.depth}`}
                label="Dài (m)"
                value={layout.ground.depth}
                min={4}
                max={512}
                onChange={(depth) => store.commit({ ...layout, ground: { ...layout.ground, depth } })}
              />
            </div>
            <label className="me-color">
              <span>Màu nền đất</span>
              <input
                aria-label="Màu nền đất"
                type="color"
                value={layout.ground.color}
                onChange={(event) =>
                  store.commit({ ...layout, ground: { ...layout.ground, color: event.target.value } })
                }
              />
            </label>
            <p className="me-muted">
              JSON lưu bố cục, không chứa file GLB. Khi dùng trong dự án, đặt mô hình vào{" "}
              <code>apps/web/public/models/</code>.
            </p>
          </details>
        </aside>
      </div>
      <footer className="me-footer">
        <span>
          <FaIcon icon={faCheck} />
          {saved}
        </span>
        <span className="me-cursor">
          {cursor ? (
            <>
              Con trỏ <b>X {cursor.x.toFixed(1)}</b> <b>Z {cursor.z.toFixed(1)}</b>
              {cursor.y > 0.01 ? <b>Y {cursor.y.toFixed(1)}</b> : null}
            </>
          ) : (
            "Rê chuột trên bản đồ để xem tọa độ"
          )}
        </span>
        <span>
          {layout.objects.length}/{MAX_MAP_OBJECTS} vật thể · 1 đơn vị = 1 mét
        </span>
      </footer>
      <input
        ref={glbInput}
        type="file"
        accept=".glb"
        multiple
        className="me-file-input"
        aria-label="Chọn file GLB"
        onChange={(event) => {
          void importModels(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      <input
        ref={jsonInput}
        type="file"
        accept=".json,application/json"
        className="me-file-input"
        aria-label="Chọn file JSON"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importJson(file);
          event.target.value = "";
        }}
      />
      {pending ? (
        <div
          className="me-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPending(null);
          }}
        >
          <form
            className="me-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="me-import-title"
            onKeyDown={(event) => {
              if (event.key === "Escape") setPending(null);
            }}
            onSubmit={(event) => {
              event.preventDefault();
              confirmImport();
            }}
          >
            <header className="me-modal-head">
              <h2 id="me-import-title">
                <FaIcon icon={faCube} /> Thêm mô hình GLB
              </h2>
              <button type="button" aria-label="Đóng" onClick={() => setPending(null)}>
                <FaIcon icon={faXmark} />
              </button>
            </header>
            <p className="me-modal-intro">
              Đặt tên cho mô hình. Tên này hiện trong thư viện và là tên file
              {projectModels ? (
                <>
                  {" "}
                  trong <code>apps/web/public/models/</code>
                </>
              ) : null}
              .
            </p>
            <div className="me-import-list">
              {pending.map((item, index) => {
                const error = pendingErrors[index];
                const replaces = existingNames.has(`${item.name.trim()}.glb`.toLocaleLowerCase());
                return (
                  <div className="me-import-row" key={item.key}>
                    <div className="me-import-thumb">
                      {item.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- ảnh data URL dựng tại chỗ
                        <img src={item.thumbUrl} alt={`Ảnh minh họa ${item.name}`} />
                      ) : item.thumbFailed ? (
                        <span>Không xem trước được</span>
                      ) : (
                        <span className="me-spinner" aria-label="Đang dựng ảnh minh họa" />
                      )}
                    </div>
                    <div className="me-import-fields">
                      <label>
                        <span>Tên mô hình</span>
                        <span className={`me-name-input ${error ? "invalid" : ""}`}>
                          <input
                            value={item.name}
                            maxLength={100}
                            autoFocus={index === 0}
                            aria-invalid={!!error}
                            onChange={(event) =>
                              setPending((current) =>
                                current
                                  ? current.map((entry) =>
                                      entry.key === item.key ? { ...entry, name: event.target.value } : entry,
                                    )
                                  : current,
                              )
                            }
                          />
                          <i>.glb</i>
                        </span>
                      </label>
                      <small>
                        File gốc: {item.file.name} · {formatSize(item.file.size)}
                      </small>
                      {error ? (
                        <small className="me-field-error">{error}</small>
                      ) : replaces ? (
                        <small className="me-field-warn">
                          Trùng tên: sẽ thay mô hình đang có trong thư viện.
                        </small>
                      ) : null}
                    </div>
                    {pending.length > 1 ? (
                      <button
                        type="button"
                        className="me-import-remove"
                        aria-label={`Bỏ ${item.name}`}
                        title="Bỏ file này"
                        onClick={() =>
                          setPending((current) => {
                            const next = current?.filter((entry) => entry.key !== item.key) ?? [];
                            return next.length ? next : null;
                          })
                        }
                      >
                        <FaIcon icon={faXmark} />
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <footer className="me-modal-foot">
              <button type="button" onClick={() => setPending(null)}>
                Hủy
              </button>
              <button type="submit" className="me-primary" disabled={pendingErrors.some(Boolean)}>
                <FaIcon icon={faPlus} />
                Thêm vào thư viện{pending.length > 1 ? ` (${pending.length})` : ""}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
      {!ready ? (
        <div className="me-loading" role="status">
          Đang khôi phục bản nháp…
        </div>
      ) : null}
    </div>
  );
}
