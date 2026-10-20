import type { Metadata } from "next";
import { requireSection } from "@/lib/auth";
import { EditorLoader } from "@/components/map-editor/editor-loader";

export const metadata: Metadata = { title: "Thiết kế bản đồ 3D" };

/** Standalone, full-width workspace; only the dev tool is usable without Supabase. */
export default async function MapEditorPage() {
  const session = process.env.NODE_ENV === "development" ? null : await requireSection("lands");
  return <EditorLoader storageKey={`lw.map-editor.v1:${session?.userId ?? "local"}`} />;
}
