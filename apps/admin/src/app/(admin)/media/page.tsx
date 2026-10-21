import type { Metadata } from "next";
import Link from "next/link";
import { ADMIN_SECTIONS } from "@lw/shared";
import { PageHeader, sectionTabs } from "@/components/page-header";
import { PlaceholderPanel } from "@/components/placeholder-panel";
import { requireSection } from "@/lib/auth";
import { cloudinaryCloudName } from "@/lib/cloudinary";
import { CloudinaryStatus } from "./_components/cloudinary-status";

export const metadata: Metadata = { title: ADMIN_SECTIONS.media.label };

/** /media: Mô hình 3D · Hình ảnh (Cloudinary) · Âm thanh. */
export default async function MediaPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireSection("media");
  const { active, bar } = sectionTabs("media", (await searchParams).tab);

  return (
    <>
      <PageHeader section="media" />
      {bar}
      {active?.key === "images" ? (
        <>
          <CloudinaryStatus cloudName={cloudinaryCloudName()} />
          <PlaceholderPanel title="Thư viện hình ảnh">
            Ảnh bìa vùng đất / khu vực đã tải lên được ngay trong từng trang Vùng đất.
          </PlaceholderPanel>
        </>
      ) : active?.key === "models" ? (
        <PlaceholderPanel title={active.label}>
          Hiện thêm mô hình GLB trong{" "}
          <Link href="/map-editor" className="font-semibold text-accent hover:underline">
            Thiết kế bản đồ 3D
          </Link>
          .
        </PlaceholderPanel>
      ) : (
        <PlaceholderPanel title={active?.label} />
      )}
    </>
  );
}
