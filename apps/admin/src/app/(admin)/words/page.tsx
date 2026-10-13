import type { Metadata } from "next";
import { ADMIN_SECTIONS, ENGLISH_VEGETABLES } from "@lw/shared";
import { Panel } from "@lw/ui";
import { PageTitle } from "@/components/page-title";
import { requireSection } from "@/lib/auth";

export const metadata: Metadata = { title: ADMIN_SECTIONS.words.label };

export default async function WordsPage() {
  await requireSection("words");

  return (
    <>
      <PageTitle>{ADMIN_SECTIONS.words.label}</PageTitle>
      <Panel title={`Tiếng Anh: rau củ (${ENGLISH_VEGETABLES.length} từ)`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-slate-500">
              <tr>
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Từ</th>
                <th className="py-2 pr-4">Nghĩa</th>
                <th className="py-2">Cấp độ</th>
              </tr>
            </thead>
            <tbody>
              {ENGLISH_VEGETABLES.map((word, index) => (
                <tr key={word.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 text-slate-400">{index + 1}</td>
                  <td className="py-2 pr-4 font-semibold">{word.word}</td>
                  <td className="py-2 pr-4">{word.meaning}</td>
                  <td className="py-2">{word.level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
