import type { Metadata } from "next";
import Link from "next/link";
import { AREA_SCENE_LABELS, LESSON_STATUS_LABELS, SKILL_LABELS } from "@lw/shared";
import { ActiveBadge, Badge } from "@/components/badge";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card } from "@/components/card";
import { PageTitle } from "@/components/page-title";
import { Tabs } from "@/components/tabs";
import { requireSection } from "@/lib/auth";
import { embeddedCount, getArea, getLand, toLesson } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ landId: string; areaId: string }>;
type SearchParams = Promise<{ tab?: string }>;

const TABS = ["info", "lessons", "words"] as const;
type Tab = (typeof TABS)[number];

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  await requireSection("lands");
  const { landId, areaId } = await params;
  const [land, area] = await Promise.all([getLand(landId), getArea(landId, areaId)]);
  return { title: `${area.name} · ${land.name}` };
}

interface AreaWord {
  id: string;
  word: string;
  meaning: string;
  level: number;
  lessonCount: number;
}

/**
 * /lands/[landId]/areas/[areaId]: khu vực với 3 tab Thông tin · Bài học · Từ vựng.
 * Tab Từ vựng chỉ có các từ mà bài học của khu vực này dùng; kho đầy đủ ở /words.
 */
export default async function AreaPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  await requireSection("lands");
  const [{ landId, areaId }, { tab: rawTab }] = await Promise.all([params, searchParams]);
  const tab: Tab = (TABS as readonly string[]).includes(rawTab ?? "") ? (rawTab as Tab) : "info";
  const [land, area] = await Promise.all([getLand(landId), getArea(landId, areaId)]);
  const base = `/lands/${land.id}/areas/${area.id}`;

  const supabase = await createClient();
  const { data: lessonRows, error: lessonError } = await supabase
    .from("lessons")
    .select("*, lesson_words(count)")
    .eq("area_id", area.id)
    .order("position")
    .order("title");
  if (lessonError) throw new Error(`Không đọc được bài học: ${lessonError.message}`);
  const lessons = lessonRows.map((row) => ({
    lesson: toLesson(row),
    wordCount: embeddedCount(row.lesson_words),
  }));

  // Từ vựng mà các bài của khu vực này dùng (gộp trùng, đếm số bài dùng mỗi từ).
  const words = new Map<string, AreaWord>();
  if (lessons.length > 0) {
    const { data: links, error: wordError } = await supabase
      .from("lesson_words")
      .select("word_id, words(id, word, meaning, level)")
      .in(
        "lesson_id",
        lessons.map(({ lesson }) => lesson.id),
      );
    if (wordError) throw new Error(`Không đọc được từ vựng của khu vực: ${wordError.message}`);
    for (const link of links) {
      const word = (Array.isArray(link.words) ? link.words[0] : link.words) as Omit<
        AreaWord,
        "lessonCount"
      > | null;
      if (!word) continue;
      const existing = words.get(word.id);
      words.set(word.id, { ...word, lessonCount: (existing?.lessonCount ?? 0) + 1 });
    }
  }
  const wordList = [...words.values()].sort((a, b) => a.level - b.level || a.word.localeCompare(b.word));

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Vùng đất", href: "/lands" },
          { label: land.name, href: `/lands/${land.id}` },
          { label: area.name },
        ]}
      />
      <PageTitle description={`${AREA_SCENE_LABELS[area.scene]} · luyện kỹ năng ${SKILL_LABELS[area.skill]}`}>
        {area.name}
      </PageTitle>

      <Tabs
        active={tab}
        items={[
          { key: "info", label: "Thông tin", href: base },
          { key: "lessons", label: "Bài học", href: `${base}?tab=lessons`, count: lessons.length },
          { key: "words", label: "Từ vựng", href: `${base}?tab=words`, count: wordList.length },
        ]}
      />

      {tab === "info" ? (
        <Card title="Thông tin khu vực">
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Kỹ năng</dt>
              <dd>
                <Badge>{SKILL_LABELS[area.skill]}</Badge>
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Mẫu cảnh 3D</dt>
              <dd className="font-medium">{AREA_SCENE_LABELS[area.scene]}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Thứ tự mở khóa</dt>
              <dd className="font-medium">{area.unlockOrder}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Trạng thái</dt>
              <dd>
                <ActiveBadge active={area.isActive} />
              </dd>
            </div>
          </dl>
        </Card>
      ) : null}

      {tab === "lessons" ? (
        <Card title={`Bài học (${lessons.length})`}>
          {lessons.length === 0 ? (
            <p className="py-4 text-sm text-slate-500">Khu vực này chưa có bài học nào.</p>
          ) : (
            <ul className="divide-y divide-secondary">
              {lessons.map(({ lesson, wordCount }) => (
                <li key={lesson.id}>
                  <Link
                    href={`${base}/lessons/${lesson.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-accent"
                  >
                    <span className="min-w-0 truncate">
                      <span className="text-slate-400">Bài {lesson.position} · </span>
                      <span className="font-medium">{lesson.title}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-slate-500">{wordCount} từ</span>
                      <Badge tone={lesson.status === "published" ? "success" : "muted"}>
                        {LESSON_STATUS_LABELS[lesson.status]}
                      </Badge>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      {tab === "words" ? (
        <Card
          title={`Từ vựng dùng trong khu vực (${wordList.length})`}
          action={{ href: "/words", label: "Mở kho từ vựng" }}
        >
          {wordList.length === 0 ? (
            <p className="py-4 text-sm text-slate-500">
              Bài học của khu vực này chưa dùng từ nào. Kho đầy đủ và nhập CSV ở trang Kho từ vựng.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-secondary text-xs text-slate-500">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Từ</th>
                    <th className="py-2 pr-4 font-medium">Nghĩa</th>
                    <th className="py-2 pr-4 font-medium">Cấp độ</th>
                    <th className="py-2 font-medium">Dùng trong</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary">
                  {wordList.map((word) => (
                    <tr key={word.id}>
                      <td className="py-2 pr-4 font-semibold">{word.word}</td>
                      <td className="py-2 pr-4">{word.meaning}</td>
                      <td className="py-2 pr-4">{word.level}</td>
                      <td className="py-2 text-slate-500">{word.lessonCount} bài</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}
    </>
  );
}
