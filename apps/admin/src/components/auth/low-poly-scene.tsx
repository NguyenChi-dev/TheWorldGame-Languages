/**
 * Cảnh nền 3D low-poly cho các trang đăng nhập: bầu trời lưới tam giác, núi nhiều mặt, cây,
 * mây và đá quý trôi lơ lửng. Toàn bộ là SVG vẽ ở máy chủ (không chạy JavaScript trên trình duyệt).
 *
 * Tam giác được sinh từ số ngẫu nhiên có SEED CỐ ĐỊNH, nên lần nào render cũng ra đúng một hình
 * (không bị lệch giữa máy chủ và trình duyệt).
 */

const W = 1600;
const H = 1000;

type Point = readonly [number, number];
type Facet = { points: string; fill: string };

/** Bộ sinh số ngẫu nhiên có seed (mulberry32). */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const toRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb: number[]) =>
  `#${rgb
    .map((v) =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;

/** Màu theo dải gradient nhiều điểm dừng, nhân thêm độ sáng `light` để tạo mặt cắt. */
function gradientAt(stops: [number, string][], t: number, light = 1) {
  const i = Math.max(0, stops.findIndex(([at]) => at >= t) - 1);
  const [t0, c0] = stops[i];
  const [t1, c1] = stops[Math.min(i + 1, stops.length - 1)];
  const k = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
  const a = toRgb(c0);
  const b = toRgb(c1);
  return toHex(a.map((v, j) => (v + (b[j] - v) * k) * light));
}

const pts = (list: readonly Point[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

/** Bầu trời: lưới điểm xê dịch ngẫu nhiên, chia thành tam giác, tô theo gradient dọc. */
function skyFacets(): Facet[] {
  const rand = seeded(20261013);
  const cols = 16;
  const rows = 10;
  const cw = W / cols;
  const rh = H / rows;
  const grid: Point[][] = [];
  for (let r = 0; r <= rows; r++) {
    grid[r] = [];
    for (let c = 0; c <= cols; c++) {
      const edgeX = c === 0 || c === cols;
      const edgeY = r === 0 || r === rows;
      grid[r][c] = [
        c * cw + (edgeX ? 0 : (rand() - 0.5) * cw * 0.75),
        r * rh + (edgeY ? 0 : (rand() - 0.5) * rh * 0.75),
      ];
    }
  }
  const sky: [number, string][] = [
    [0, "#fff9fa"],
    [0.45, "#fde4ea"],
    [1, "#f6bccb"],
  ];
  const facets: Facet[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const [a, b, d, e] = [grid[r][c], grid[r][c + 1], grid[r + 1][c], grid[r + 1][c + 1]];
      const tris: Point[][] =
        (r + c) % 2
          ? [
              [a, b, e],
              [a, e, d],
            ]
          : [
              [a, b, d],
              [b, e, d],
            ];
      for (const tri of tris) {
        const cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
        facets.push({ points: pts(tri), fill: gradientAt(sky, cy / H, 0.965 + rand() * 0.07) });
      }
    }
  }
  return facets;
}

/** Một dãy núi: mỗi đỉnh tách làm mặt sáng (trái) và mặt tối (phải); `snow` thêm chóp tuyết. */
function mountainFacets(
  peaks: [x: number, height: number, halfWidth: number][],
  lit: string,
  shadow: string,
  snow = false,
): Facet[] {
  return peaks.flatMap(([x, h, w]) => {
    const top = H - h;
    const facets: Facet[] = [
      {
        points: pts([
          [x - w, H],
          [x, top],
          [x - w * 0.1, H],
        ]),
        fill: lit,
      },
      {
        points: pts([
          [x - w * 0.1, H],
          [x, top],
          [x + w, H],
        ]),
        fill: shadow,
      },
    ];
    if (snow) {
      const sy = top + h * 0.2;
      facets.push(
        {
          points: pts([
            [x - w * 0.2, sy],
            [x, top],
            [x - w * 0.02, sy + 14],
          ]),
          fill: "#ffffff",
        },
        {
          points: pts([
            [x - w * 0.02, sy + 14],
            [x, top],
            [x + w * 0.2, sy],
          ]),
          fill: "#f4e4ea",
        },
      );
    }
    return facets;
  });
}

function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-4} y={-10} width={8} height={22} fill="#8a5a4a" />
      <polygon points="-26,-6 0,-70 0,-6" fill="#63c3a4" />
      <polygon points="0,-6 0,-70 26,-6" fill="#3f9e83" />
      <polygon points="-20,-34 0,-92 0,-34" fill="#74d0b1" />
      <polygon points="0,-34 0,-92 20,-34" fill="#4aad90" />
    </g>
  );
}

/** Mây low-poly: vài mặt tam giác trắng/hồng nhạt. Trôi ngang qua lại chậm. */
function Cloud({ x, y, s = 1, delay = "0s" }: { x: number; y: number; s?: number; delay?: string }) {
  const facets: [string, string][] = [
    ["0,40 18,18 40,40", "#ffffff"],
    ["18,18 45,0 60,22", "#ffffff"],
    ["18,18 60,22 40,40", "#f8eef1"],
    ["40,40 60,22 85,40", "#fcf5f7"],
    ["60,22 82,6 102,26", "#ffffff"],
    ["60,22 102,26 85,40", "#f3e2e8"],
    ["85,40 102,26 124,40", "#f8eef1"],
  ];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="animate-drift" style={{ animationDelay: delay }}>
        {facets.map(([p, fill]) => (
          <polygon key={p} points={p} fill={fill} />
        ))}
      </g>
    </g>
  );
}

/** Viên đá quý bát diện xoay nhìn nghiêng: 4 mặt với 4 độ sáng khác nhau. */
function Gem({
  x,
  y,
  s = 1,
  colors,
  delay = "0s",
}: {
  x: number;
  y: number;
  s?: number;
  colors: string[];
  delay?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="animate-float" style={{ animationDelay: delay }}>
        <polygon points="0,-30 -18,0 0,0" fill={colors[0]} />
        <polygon points="0,-30 0,0 18,0" fill={colors[1]} />
        <polygon points="-18,0 0,30 0,0" fill={colors[2]} />
        <polygon points="0,0 0,30 18,0" fill={colors[3]} />
      </g>
    </g>
  );
}

export function LowPolyScene() {
  const sky = skyFacets();
  const back = mountainFacets(
    [
      [120, 430, 260],
      [430, 520, 300],
      [760, 420, 260],
      [1080, 540, 320],
      [1420, 460, 280],
    ],
    "#f4c6d2",
    "#e8aebf",
    true,
  );
  const middle = mountainFacets(
    [
      [-20, 300, 240],
      [300, 340, 260],
      [640, 280, 240],
      [980, 330, 260],
      [1300, 300, 240],
      [1620, 350, 260],
    ],
    "#ea9db1",
    "#d87f98",
  );
  const front = mountainFacets(
    [
      [100, 170, 260],
      [520, 130, 300],
      [900, 150, 280],
      [1280, 140, 300],
      [1650, 180, 260],
    ],
    "#c9627f",
    "#b04a68",
  );

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
    >
      {sky.map((f, i) => (
        <polygon key={i} points={f.points} fill={f.fill} stroke={f.fill} strokeWidth={1} />
      ))}

      {/* Mặt trời low-poly. */}
      <g transform="translate(1330 170)">
        <circle r={110} fill="#fff4d6" opacity={0.5} />
        <polygon points="0,-62 44,-44 62,0 44,44 0,62 -44,44 -62,0 -44,-44" fill="#ffe9b0" />
        <polygon points="0,-62 44,-44 62,0 0,0" fill="#fff3cf" />
        <polygon points="0,0 44,44 0,62 -44,44" fill="#ffdf97" />
      </g>

      <Cloud x={140} y={130} s={1.6} />
      <Cloud x={620} y={70} s={1.1} delay="-4s" />
      <Cloud x={1050} y={250} s={1.4} delay="-8s" />

      {back.map((f, i) => (
        <polygon key={`b${i}`} points={f.points} fill={f.fill} />
      ))}
      {middle.map((f, i) => (
        <polygon key={`m${i}`} points={f.points} fill={f.fill} />
      ))}

      <Cloud x={-40} y={560} s={1.3} delay="-2s" />
      <Cloud x={1380} y={520} s={1.2} delay="-6s" />

      {front.map((f, i) => (
        <polygon key={`f${i}`} points={f.points} fill={f.fill} />
      ))}

      <Tree x={70} y={905} s={1.1} />
      <Tree x={150} y={930} s={0.85} />
      <Tree x={260} y={950} s={1} />
      <Tree x={1330} y={940} s={1.05} />
      <Tree x={1430} y={915} s={0.9} />
      <Tree x={1530} y={945} s={1.15} />

      <Gem x={250} y={330} s={1.3} colors={["#ffd978", "#f5b941", "#e9a12a", "#cf8615"]} />
      <Gem x={1480} y={420} s={1.1} colors={["#9ee6cf", "#63c3a4", "#4aad90", "#2f8d72"]} delay="-2s" />
      <Gem x={860} y={170} s={0.9} colors={["#f7b3c4", "#e88fa5", "#c75c7a", "#a83d5a"]} delay="-3.5s" />
    </svg>
  );
}
