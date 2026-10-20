"use client";

import dynamic from "next/dynamic";

const MapEditor = dynamic(() => import("./map-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center bg-[#101923] text-slate-200">
      Đang mở xưởng thiết kế 3D…
    </div>
  ),
});

export function EditorLoader({ storageKey, projectModels }: { storageKey: string; projectModels: boolean }) {
  return <MapEditor storageKey={storageKey} projectModels={projectModels} />;
}
