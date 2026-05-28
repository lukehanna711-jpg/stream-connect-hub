import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Show } from "@/lib/shows";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export function ShowCard({ show, episode }: { show: Show; episode?: number }) {
  const { user } = useAuth();
  const [resolvedEp, setResolvedEp] = useState<number | null>(episode ?? null);

  useEffect(() => {
    if (episode !== undefined) { setResolvedEp(episode); return; }
    if (!user) { setResolvedEp(1); return; }
    let cancelled = false;
    supabase
      .from("watch_history")
      .select("episode")
      .eq("user_id", user.id)
      .eq("show_id", show.id)
      .order("watched_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (cancelled) return;
        const last = data?.[0]?.episode;
        if (!last) { setResolvedEp(1); return; }
        setResolvedEp(Math.min(show.episodes, last + 1));
      });
    return () => { cancelled = true; };
  }, [user, show.id, show.episodes, episode]);

  const ep = String(resolvedEp ?? 1);

  return (
    <Link
      to="/watch/$showId/$ep"
      params={{ showId: show.id, ep }}
      className="group block"
    >
      <div className="aspect-[3/4] rounded-lg overflow-hidden relative" style={{ background: show.cover }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="font-semibold text-sm text-white leading-tight">{show.title}</div>
          <div className="text-xs text-white/70 mt-1">{show.episodes} episodes</div>
        </div>
        <div className="absolute inset-0 ring-2 ring-primary opacity-0 group-hover:opacity-100 transition rounded-lg" />
      </div>
    </Link>
  );
}
