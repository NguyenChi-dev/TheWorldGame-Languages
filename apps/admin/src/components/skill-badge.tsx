import { faCircleQuestion } from "@fortawesome/free-solid-svg-icons";
import type { Skill, SkillColorKey } from "@lw/shared";
import { SKILL_ICONS } from "@/components/content-icons";
import { FaIcon } from "@/components/fa-icon";

/** Màu nhạt của nhãn kỹ năng, theo mã màu admin chọn (danh sách cố định SKILL_COLOR_KEYS). */
export const SKILL_COLOR_CLASSES: Record<SkillColorKey, string> = {
  pink: "bg-pink-50 text-pink-700 ring-pink-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  orange: "bg-orange-50 text-orange-700 ring-orange-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  teal: "bg-teal-50 text-teal-700 ring-teal-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
};

const badge =
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset";

/** Nhãn kỹ năng: icon + tên, màu theo kỹ năng. Không tìm thấy kỹ năng thì hiện nhãn xám. */
export function SkillBadge({ skill }: { skill: Pick<Skill, "name" | "icon" | "color"> | null | undefined }) {
  if (!skill) {
    return (
      <span className={`${badge} ${SKILL_COLOR_CLASSES.slate}`}>
        <FaIcon icon={faCircleQuestion} className="text-[10px]" />
        Chưa rõ kỹ năng
      </span>
    );
  }
  return (
    <span className={`${badge} ${SKILL_COLOR_CLASSES[skill.color]}`}>
      <FaIcon icon={SKILL_ICONS[skill.icon]} className="text-[10px]" />
      {skill.name}
    </span>
  );
}
