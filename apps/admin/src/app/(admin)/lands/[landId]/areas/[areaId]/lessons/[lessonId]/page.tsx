import type { Metadata } from "next";
import { LESSON_STATUS_LABELS, SKILL_LABELS } from "@lw/shared";
import { Badge } from "@/components/badge";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card } from "@/components/card";
import { ComingLater, PageTitle } from "@/components/page-title";
import { requireSection } from "@/lib/auth";
import { getArea, getLand, getLesson, lessonLabel } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ landId: string; areaId: string; lessonId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  await requireSection("lands");
  const { landId, areaId, lessonId } = await params;
  await getArea(landId, areaId);
  const lesson = await getLesson(areaId, lessonId);
  return { title: lesson.title };
}

/** /lands/[landId]/areas/[areaId]/lessons/[lessonId]: soạn một bài học (khung, chưa có trình soạn). */
export default async function LessonPage({ params }: { params: Params }) {
  await requireSection("lands");
  const { landId, areaId, lessonId } = await params;
  const [land, area] = await Promise.all([getLand(landId), getArea(landId, areaId)]);
  const lesson = await getLesson(area.id, lessonId);

  const supabase = await createClient();
  const { data: links, error } = await supabase
    .from("lesson_words")
    .select("position, words(id, word, meaning)")
    .eq("lesson_id", lesson.id)
    .order("position");
  if (error) throw new Error(`Không đọc được từ vựng của bài: ${error.message}`);
  const words = links
    .map(
      (link) =>
        (Array.isArray(link.words) ? link.words[0] : link.words) as {
          id: string;
          word: string;
          meaning: string;
        } | null,
    )
    .filter((word) => word !== null);

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Vùng đất", href: "/lands" },
          { label: land.name, href: `/lands/${land.id}` },
          { label: area.name, href: `/lands/${land.id}/areas/${area.id}?tab=lessons` },
          { label: lessonLabel(lesson) },
        ]}
      />
      <PageTitle description={`${area.name} · kỹ năng ${SKILL_LABELS[area.skill]}`}>{lesson.title}</PageTitle>

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <ComingLater />
        <div className="space-y-4">
          <Card title="Trạng thái">
            <Badge tone={lesson.status === "published" ? "success" : "muted"}>
              {LESSON_STATUS_LABELS[lesson.status]}
            </Badge>
          </Card>
          <Card title={`Từ vựng của bài (${words.length})`}>
            {words.length === 0 ? (
              <p className="py-2 text-sm text-slate-500">Bài chưa dùng từ nào.</p>
            ) : (
              <ul className="divide-y divide-secondary text-sm">
                {words.map((word) => (
                  <li key={word.id} className="flex justify-between gap-3 py-2">
                    <span className="font-semibold">{word.word}</span>
                    <span className="text-slate-500">{word.meaning}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
