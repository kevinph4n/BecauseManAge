"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function FollowButton({ meId, targetId, following }: { meId: string; targetId: string; following: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(following);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const supabase = createClient();
    if (on) await supabase.from("follows").delete().eq("follower_id", meId).eq("following_id", targetId);
    else await supabase.from("follows").insert({ follower_id: meId, following_id: targetId });
    setOn(!on);
    setBusy(false);
    router.refresh();
  }

  return (
    <button className={`btn ${on ? "" : "btn-primary"}`} onClick={toggle} disabled={busy}>
      {on ? "✓ Đang follow" : "+ Follow"}
    </button>
  );
}
