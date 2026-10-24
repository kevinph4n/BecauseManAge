import { addDays, startOfWeek, toISODate } from "@/lib/utils";

const SHADES = ["#ebebe5", "#c2c2bb", "#8f8f88", "#4f4f4a", "#111111"];

function level(n: number) {
  if (n <= 0) return 0;
  if (n <= 2) return 1;
  if (n <= 5) return 2;
  if (n <= 9) return 3;
  return 4;
}

/** Biểu đồ commit kiểu GitHub — nhưng đen trắng */
export function ContributionGraph({ data }: { data: { day: string; count: number }[] }) {
  const map = new Map(data.map((d) => [d.day.slice(0, 10), d.count]));
  const today = new Date();
  const start = addDays(startOfWeek(today), -52 * 7);
  const weeks = Array.from({ length: 53 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  const total = data.reduce((s, d) => s + d.count, 0);
  const cell = 11;
  const gap = 3;

  return (
    <div>
      <div className="thin-scroll overflow-x-auto pb-1">
        <svg width={53 * (cell + gap) + 24} height={7 * (cell + gap) + 18} className="block">
          {weeks.map((week, w) =>
            week[0].getDate() <= 7 ? (
              <text key={`m${w}`} x={24 + w * (cell + gap)} y={9} fontSize={9} fill="#6b6b66">
                T{week[0].getMonth() + 1}
              </text>
            ) : null,
          )}
          {["T2", "", "T4", "", "T6", "", ""].map((d, i) => (
            <text key={i} x={0} y={18 + i * (cell + gap) + 9} fontSize={9} fill="#6b6b66">
              {d}
            </text>
          ))}
          {weeks.map((week, w) =>
            week.map((day, d) => {
              if (day > today) return null;
              const iso = toISODate(day);
              const n = map.get(iso) ?? 0;
              return (
                <rect
                  key={iso}
                  x={24 + w * (cell + gap)}
                  y={14 + d * (cell + gap)}
                  width={cell}
                  height={cell}
                  rx={2}
                  fill={SHADES[level(n)]}
                  stroke="#111"
                  strokeOpacity={n ? 0.4 : 0.08}
                >
                  <title>{`${iso}: ${n} commit`}</title>
                </rect>
              );
            }),
          )}
        </svg>
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-smoke">
        <span>{total} commits trong 1 năm qua</span>
        <span className="flex items-center gap-1">
          Ít
          {SHADES.map((c) => (
            <span key={c} className="inline-block h-[11px] w-[11px] rounded-sm border border-ink/30" style={{ background: c }} />
          ))}
          Nhiều
        </span>
      </div>
    </div>
  );
}
