"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  faArrowDown,
  faArrowLeft,
  faArrowPointer,
  faArrowsUpDownLeftRight,
  faCheck,
  faChevronDown,
  faCopy,
  faCube,
  faDownload,
  faExpand,
  faEye,
  faEyeSlash,
  faFileImport,
  faFlag,
  faFolderOpen,
  faGrip,
  faLock,
  faPlus,
  faRotate,
  faRotateLeft,
  faRotateRight,
  faSliders,
  faTableColumns,
  faTrash,
  faUnlock,
  faUpRightAndDownLeftFromCenter,
} from "@fortawesome/free-solid-svg-icons";
import { startMapEditor, type EditorTool, type MapEditorHandle, type ModelStatus } from "@lw/game/editor";
import {
  emptyMap,
  MAX_LAYOUT_BYTES,
  MAX_MAP_OBJECTS,
  readMapJson,
  SPAWN_ID,
  writeMapJson,
  type MapObject,
  type PrimitiveKind,
} from "@lw/shared/map-layout";
import { FaIcon } from "@/components/fa-icon";
import { createEditorStore } from "./editor-store";
import { inspectGlb, resolveModelSource, restoreModels, saveModel } from "./local-assets";
import { NumberField, TextField, VectorFields } from "./editor-fields";
import "./map-editor.css";

const PRIMITIVES: { kind: PrimitiveKind; name: string; color: string }[] = [
  { kind: "box", name: "Khối hộp", color: "#c7a681" },
  { kind: "cylinder", name: "Khối trụ", color: "#bba8cf" },
  { kind: "sphere", name: "Khối cầu", color: "#82b8a0" },
];
const TOOLS = [
  { key: "move", label: "Di chuyển", shortcut: "W", icon: faArrowsUpDownLeftRight },
  { key: "rotate", label: "Xoay", shortcut: "E", icon: faRotate },
  { key: "scale", label: "Đổi kích thước", shortcut: "R", icon: faUpRightAndDownLeftFromCenter },
] as const;
const STATUS: Record<ModelStatus, string> = {
  loading: "Đang tải mô hình",
  ready: "Sẵn sàng",
  missing: "Cần chọn lại file GLB",
  error: "Không đọc được GLB — chọn lại file",
};
const baseObject = (name: string) => ({
  id: crypto.randomUUID(),
  name,
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
  visible: true,
  locked: false,
});
const modelName = (file: File) =>
  file.name
    .replace(/\.glb$/i, "")
    .trim()
    .slice(0, 100) || "Mô hình";

function downloadJson(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function MapEditor({ storageKey }: { storageKey: string }) {
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
  const [statuses, setStatuses] = useState<Record<string, ModelStatus>>({});
  const [tool, setTool] = useState<EditorTool>("move");
  const [snap, setSnap] = useState(true);
  const [grid, setGrid] = useState(true);
  const [gridStep, setGridStep] = useState(1);
  const [showLibrary, setShowLibrary] = useState(true);
  const [showInspector, setShowInspector] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [viewportError, setViewportError] = useState("");
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState("Đang mở bản nháp…");
  const [search, setSearch] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const selected = layout.objects.find((object) => object.id === selectedId);
  const isSpawn = selectedId === SPAWN_ID;

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
        const files = await restoreModels(storageKey);
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
  }, [storageKey, store]);

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

  const exportJson = useCallback(() => {
    try {
      const map = store.getSnapshot().layout;
      const filename =
        map.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        !ready ||
        busy ||
        (target instanceof HTMLElement &&
          (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)))
      )
        return;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
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
      } else if (!mod && !event.altKey) {
        if (key === "w") setTool("move");
        if (key === "e") setTool("rotate");
        if (key === "r") setTool("scale");
        if (key === "f") editorRef.current?.focus();
        if (key === "home") {
          event.preventDefault();
          editorRef.current?.frameAll();
        }
        if (key === "delete" || key === "backspace") {
          event.preventDefault();
          store.remove();
        }
        if (key === "escape") store.select(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, busy, store, exportJson]);

  const addPrimitive = (kind: PrimitiveKind) => {
    if (layout.objects.length >= MAX_MAP_OBJECTS) {
      setNotice("Mỗi bản đồ tối đa 500 vật thể.");
      return;
    }
    const preset = PRIMITIVES.find((item) => item.kind === kind)!;
    store.add([{ ...baseObject(preset.name), kind, color: preset.color, scale: { x: 3, y: 3, z: 3 } }]);
  };
  const addModel = (source: string, file: File) => {
    if (store.getSnapshot().layout.objects.length >= MAX_MAP_OBJECTS) {
      setNotice("Mỗi bản đồ tối đa 500 vật thể.");
      return;
    }
    store.add([{ ...baseObject(modelName(file)), kind: "glb", source }]);
  };
  const importModels = async (files: File[]) => {
    if (!ready || busy || !files.length) return;
    setBusy(true);
    const errors: string[] = [];
    const next = new Map(models);
    const additions: MapObject[] = [];
    try {
      for (const file of files) {
        try {
          const asset = await inspectGlb(file);
          asset.source = resolveModelSource(asset, store.getSnapshot().layout);
          // Re-selecting the same model reconnects missing references without adding duplicates.
          if (
            next.has(asset.source) &&
            !window.confirm(`Thay mô hình ${file.name}? Các vật thể dùng file này sẽ được cập nhật.`)
          )
            continue;
          next.set(asset.source, asset.file);
          try {
            await saveModel(storageKey, asset);
          } catch {
            errors.push(`${file.name}: chỉ giữ được trong phiên này, hãy giữ file gốc.`);
          }
          if (
            !store
              .getSnapshot()
              .layout.objects.some((object) => object.kind === "glb" && object.source === asset.source) &&
            !additions.some((object) => object.kind === "glb" && object.source === asset.source) &&
            store.getSnapshot().layout.objects.length + additions.length < MAX_MAP_OBJECTS
          ) {
            additions.push({
              ...baseObject(modelName(file)),
              kind: "glb",
              source: asset.source,
              position: { x: additions.length * 3, y: 0, z: 0 },
            });
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
          : "Đã thêm GLB vào thư viện trên máy. Chọn mô hình rồi nhấn F để nhìn gần.",
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
          <span>{layout.name}</span>
          <small>LOCAL</small>
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
        <div className="me-tool-group">
          {TOOLS.map((item) => (
            <button
              key={item.key}
              className={tool === item.key ? "active" : ""}
              aria-pressed={tool === item.key}
              title={`${item.label} (${item.shortcut})`}
              aria-label={item.label}
              onClick={() => setTool(item.key)}
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
            title="Di chuyển 0,5 m · xoay 15° · tỷ lệ 0,1"
          >
            <FaIcon icon={faGrip} />
            <span>Bám lưới</span>
          </button>
          <button className={grid ? "active" : ""} aria-pressed={grid} onClick={() => setGrid(!grid)}>
            Lưới
          </button>
        </div>
        <span className="me-toolbar-end">
          X <i /> Z <i /> <b>Y ↑ độ cao</b>
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
          <section>
            <div className="me-section-title">
              <h2>Thư viện vật thể</h2>
              <FaIcon icon={faFolderOpen} />
            </div>
            <button
              className="me-import-glb"
              disabled={!ready || busy}
              onClick={() => glbInput.current?.click()}
            >
              <FaIcon icon={faPlus} />
              <span>{busy ? "Đang đọc file…" : "Thêm mô hình GLB"}</span>
              <small>Chọn từ máy · tối đa 50 MB/file</small>
            </button>
            <div className="me-primitives">
              {PRIMITIVES.map((item) => (
                <button key={item.kind} disabled={!ready || busy} onClick={() => addPrimitive(item.kind)}>
                  <span className={`me-shape me-${item.kind}`} style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
            {models.size ? (
              <div className="me-models">
                {Array.from(models).map(([source, file]) => (
                  <button
                    key={source}
                    disabled={busy}
                    onClick={() => addModel(source, file)}
                    title={`Thêm ${file.name}`}
                  >
                    <FaIcon icon={faCube} />
                    <span>{file.name}</span>
                    <FaIcon icon={faPlus} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="me-muted">Dùng khối có sẵn để phác bố cục, hoặc thêm mô hình của bạn.</p>
            )}
          </section>
          <section className="me-outliner">
            <div className="me-section-title">
              <h2>Trong bản đồ</h2>
              <span className="me-count">{layout.objects.length}</span>
            </div>
            <input
              className="me-search"
              aria-label="Tìm vật thể"
              placeholder="Tìm vật thể…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button
              className={`me-object ${isSpawn ? "selected" : ""}`}
              onClick={() => store.select(SPAWN_ID)}
            >
              <FaIcon icon={faFlag} />
              <span>Điểm xuất hiện</span>
            </button>
            <div className="me-object-list">
              {list.map((object) => (
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
                    <FaIcon icon={faCube} />
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
              ))}
            </div>
            {!layout.objects.length ? (
              <p className="me-muted">Bản đồ còn trống. Thêm vật thể để bắt đầu.</p>
            ) : null}
          </section>
          <div className="me-local-note">
            <span className="me-dot" />
            <span>
              Bản nháp ở trên thiết bị của bạn.
              <br />
              Xuất JSON để giữ một bản sao.
            </span>
          </div>
        </aside>

        <main
          className={`me-viewport ${dragOver ? "drag-over" : ""}`}
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
          {!layout.objects.length && !viewportError ? (
            <div className="me-empty-hint">
              <FaIcon icon={faCube} />
              <h2>Một thế giới, theo cách của bạn.</h2>
              <p>Thêm khối từ thư viện hoặc kéo file GLB vào đây.</p>
            </div>
          ) : null}
          {dragOver ? (
            <div className="me-drop-overlay">
              <FaIcon icon={faFolderOpen} />
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
              {unavailable.length} mô hình chưa tải được. Chọn lại file GLB có cùng tên trong “Thêm mô hình
              GLB”.
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
              <div className="me-selection-heading">
                <span>
                  <FaIcon icon={isSpawn ? faFlag : faCube} />
                </span>
                <div>
                  <strong>{isSpawn ? "Điểm xuất hiện" : selected?.name}</strong>
                  <small>
                    {isSpawn ? "VỊ TRÍ BẮT ĐẦU" : selected?.kind === "glb" ? "MÔ HÌNH GLB" : "KHỐI CƠ BẢN"}
                  </small>
                </div>
              </div>
              {selected ? (
                <TextField
                  label="Tên vật thể"
                  value={selected.name}
                  disabled={selected.locked}
                  onChange={(name) => updateSelected((object) => ({ ...object, name }))}
                />
              ) : null}
              {selected?.kind === "glb" ? (
                <div className="me-asset-reference">
                  <code>{selected.source}</code>
                  <span>{STATUS[statuses[selected.id] ?? "loading"]}</span>
                </div>
              ) : null}
              {selected?.locked ? (
                <p className="me-muted">Vật thể đang khóa. Mở khóa trong danh sách để chỉnh.</p>
              ) : null}
              <VectorFields
                key={`${selectedId}-position`}
                label="Vị trí"
                unit="m"
                value={isSpawn ? layout.spawn : selected!.position}
                disabled={selected?.locked}
                onChange={(position) =>
                  isSpawn
                    ? store.commit({ ...layout, spawn: position })
                    : updateSelected((object) => ({ ...object, position }))
                }
              />
              {selected ? (
                <>
                  <VectorFields
                    key={`${selectedId}-rotation`}
                    label="Góc xoay"
                    unit="°"
                    value={selected.rotation}
                    disabled={selected.locked}
                    onChange={(rotation) => updateSelected((object) => ({ ...object, rotation }))}
                  />
                  <VectorFields
                    key={`${selectedId}-scale`}
                    label="Tỷ lệ"
                    value={selected.scale}
                    scale
                    disabled={selected.locked}
                    onChange={(scale) => updateSelected((object) => ({ ...object, scale }))}
                  />
                  {selected.kind !== "glb" ? (
                    <label className="me-color">
                      <span>Màu vật thể</span>
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
                    </label>
                  ) : null}
                </>
              ) : null}
              <div className="me-inspector-actions">
                <button
                  disabled={selected?.locked || (!selected?.visible && !isSpawn)}
                  onClick={() => editorRef.current?.dropToSurface()}
                >
                  <FaIcon icon={faArrowDown} />
                  Đặt xuống bề mặt
                </button>
                <button onClick={() => editorRef.current?.focus()}>
                  <FaIcon icon={faExpand} />
                  Nhìn gần <kbd>F</kbd>
                </button>
                {selected ? (
                  <>
                    <button
                      disabled={layout.objects.length >= MAX_MAP_OBJECTS}
                      onClick={() => store.duplicate()}
                    >
                      <FaIcon icon={faCopy} />
                      Nhân bản
                    </button>
                    <button className="me-danger" disabled={selected.locked} onClick={() => store.remove()}>
                      <FaIcon icon={faTrash} />
                      Xóa vật thể
                    </button>
                  </>
                ) : null}
              </div>
              <p className="me-muted">
                Y là độ cao. Kéo trục xanh lá để xếp vật thể lên nhau; “Đặt xuống bề mặt” hạ vật thể xuống mặt
                bên dưới.
              </p>
            </>
          ) : (
            <div className="me-inspector-empty">
              <FaIcon icon={faArrowPointer} />
              <p>Chọn một vật thể trong cảnh hoặc danh sách để chỉnh.</p>
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
        <span>
          {layout.objects.length}/{MAX_MAP_OBJECTS} vật thể · 1 đơn vị = 1 mét
        </span>
        <span>Ctrl+S Xuất · Ctrl+Z Hoàn tác · Ctrl+D Nhân bản</span>
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
      {!ready ? (
        <div className="me-loading" role="status">
          Đang khôi phục bản nháp…
        </div>
      ) : null}
    </div>
  );
}
