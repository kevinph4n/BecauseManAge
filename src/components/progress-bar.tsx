import type { ProgressSummary } from "@/lib/progress";
import { phaseColor } from "@/lib/progress";
import { cn } from "@/lib/utils";

/**
 * Thanh tiến độ theo milestone.
 * - Mỗi milestone = 1 ô, độ rộng bằng nhau → phase nào nhiều mốc thì chiếm nhiều %.
 * - Màu theo phase (phase 1 nhạt → càng mở rộng càng đậm).
 * - Mốc xong: tô đặc. Chưa xong: sọc + mờ.
 */
export function ProgressBar({
  progress,
  size = "md",
  showLegend = true,
}: {
  progress: ProgressSummary;
  size?: "sm" | "md" | "lg";
  showLegend?: boolean;
}) {
  const h = size === "sm" ? "h-3" : size === "lg" ? "h-7" : "h-5";
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className={cn("box flex flex-1 overflow-hidden p-0! bg-white", h)}>
          {progress.ordered.length === 0 ? (
            <div className="hatch h-full w-full bg-fog" />
          ) : (
            progress.ordered.map(({ milestone, state }, i) => {
              const done = state === "completed";
              return (
                <div
                  key={milestone.id}
                  title={`${milestone.title} — Phase ${milestone.phase} — ${done ? "Completed" : state}`}
                  className={cn("h-full flex-1", !done && "hatch", i > 0 && "border-l border-white/70")}
                  style={{ background: phaseColor(milestone.phase), opacity: done ? 1 : 0.35 }}
                />
              );
            })
          )}
        </div>
        <span className={cn("h-hand tabular-nums", size === "sm" ? "text-lg" : "text-3xl")}>{progress.percent}%</span>
      </div>
      {showLegend && progress.phases.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-smoke">
          {progress.phases.map((p) => (
            <span key={p.phase} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 border border-ink" style={{ background: phaseColor(p.phase) }} />
              Phase {p.phase}: {p.done}/{p.total} mốc · chiếm {Math.round(p.share)}%
            </span>
          ))}
          <span className="ml-auto">
            {progress.done}/{progress.total} milestones completed
          </span>
        </div>
      )}
    </div>
  );
}
