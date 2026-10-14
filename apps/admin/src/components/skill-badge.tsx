import { SKILL_LABELS, type Skill } from "@lw/shared";
import { SKILL_ICONS } from "@/components/content-icons";
import { FaIcon } from "@/components/fa-icon";

/** Mỗi kỹ năng một màu nhạt riêng để nhìn lướt là phân biệt được khu vực. */
const SKILL_COLORS: Record<Skill, string> = {
  vocabulary: "bg-pink-50 text-pink-700 ring-pink-200",
  listening: "bg-sky-50 text-sky-700 ring-sky-200",
  conversation: "bg-violet-50 text-violet-700 ring-violet-200",
  reading: "bg-amber-50 text-amber-700 ring-amber-200",
  writing: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  grammar: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  directions: "bg-teal-50 text-teal-700 ring-teal-200",
  group_talk: "bg-orange-50 text-orange-700 ring-orange-200",
};

export function SkillBadge({ skill }: { skill: Skill }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${SKILL_COLORS[skill]}`}
    >
      <FaIcon icon={SKILL_ICONS[skill]} className="text-[10px]" />
      {SKILL_LABELS[skill]}
    </span>
  );
}
