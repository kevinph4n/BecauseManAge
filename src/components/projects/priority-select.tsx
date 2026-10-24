"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Priority } from "@/lib/types";
import { PRIORITY_LABEL, cn } from "@/lib/utils";

const ICON: Record<Priority, string> = { low: "○", moderate: "◐", high: "●" };

/** Priority cá nhân — chỉ mình bạn thấy (RLS chặn ở DB). */
export function PrioritySelect({
  target,
  id,
  value,
  meId,
}: {
  target: "task" | "milestone";
  id: string;
  value: Priority | undefined;
  meId: string;
}) {
  const [v, setV] = useState<Priority | "">(value ?? "");
  const [busy, setBusy] = useState(false);

  async function change(next: Priority | "") {
    setV(next);
    setBusy(true);
    const supabase = createClient();
    const col = target === "task" ? "task_id" : "milestone_id";
    if (!next) {
      await supabase.from("personal_priorities").delete().eq("user_id", meId).eq(col, id);
    } else {
      await supabase
        .from("personal_priorities")
        .upsert({ user_id: meId, [col]: id, priority: next, updated_at: new Date().toISOString() }, { onConflict: `user_id,${col}` });
    }
    setBusy(false);
  }

  return (
    <label
      className={cn("chip cursor-pointer gap-1 bg-white", v === "high" && "bg-ink text-white", busy && "opacity-60")}
      title="Priority cá nhân — chỉ mình bạn thấy"
    >
      <span aria-hidden>🔒</span>
      {v ? `${ICON[v]} ` : ""}
      <select
        className="cursor-pointer bg-transparent outline-none"
        value={v}
        onChange={(e) => change(e.target.value as Priority | "")}
        onClick={(e) => e.stopPropagation()}
      >
        <option value="">Priority</option>
        {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
          <option key={p} value={p} className="text-ink">
            {PRIORITY_LABEL[p]}
          </option>
        ))}
      </select>
    </label>
  );
}
