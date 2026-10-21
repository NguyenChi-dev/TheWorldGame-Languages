import { ADMIN_SECTIONS, activeSectionTab, type AdminSectionKey, type AdminSectionTab } from "@lw/shared";
import { PageTitle } from "@/components/page-title";
import { Tabs } from "@/components/tabs";

/** Tên mục + mô tả một dòng, lấy từ cấu hình menu (ADMIN_SECTIONS). */
export function PageHeader({ section }: { section: AdminSectionKey }) {
  const { label, description } = ADMIN_SECTIONS[section];
  return <PageTitle description={description}>{label}</PageTitle>;
}

/**
 * Thanh tab của một mục chính (đổi bằng ?tab=...). Trả về cả tab đang mở để trang chọn nội dung.
 */
export function sectionTabs(
  section: AdminSectionKey,
  tab: string | string[] | undefined,
): { active: AdminSectionTab | null; bar: React.ReactNode } {
  const config = ADMIN_SECTIONS[section];
  const active = activeSectionTab(config, tab);
  const bar =
    config.tabs.length > 1 && active ? (
      <Tabs
        active={active.key}
        items={config.tabs.map((item) => ({
          key: item.key,
          label: item.label,
          href: `${config.href}?tab=${item.key}`,
        }))}
      />
    ) : null;
  return { active, bar };
}
