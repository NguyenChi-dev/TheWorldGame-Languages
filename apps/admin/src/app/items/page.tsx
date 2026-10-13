import type { Metadata } from "next";
import { SEED_LIST } from "@lw/shared";
import { Panel } from "@lw/ui";
import { PageTitle } from "@/components/page-title";

export const metadata: Metadata = { title: "Vật phẩm" };

export default function ItemsPage() {
  return (
    <>
      <PageTitle>Vật phẩm</PageTitle>
      <Panel title={`Hạt giống (${SEED_LIST.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-slate-500">
              <tr>
                <th className="py-2 pr-4">Mã</th>
                <th className="py-2 pr-4">Từ vựng</th>
                <th className="py-2 pr-4">Giá mua</th>
                <th className="py-2 pr-4">Giá bán nông sản</th>
                <th className="py-2">Thời gian lớn</th>
              </tr>
            </thead>
            <tbody>
              {SEED_LIST.map((seed) => (
                <tr key={seed.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-mono text-slate-500">{seed.id}</td>
                  <td className="py-2 pr-4">
                    <span className="font-semibold">{seed.word}</span> ({seed.meaning})
                  </td>
                  <td className="py-2 pr-4">{seed.buyPrice} vàng</td>
                  <td className="py-2 pr-4">{seed.sellPrice} vàng</td>
                  <td className="py-2">{seed.growSeconds} giây</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
