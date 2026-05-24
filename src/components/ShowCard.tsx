import { Link } from "@tanstack/react-router";
import type { Show } from "@/lib/shows";

export function ShowCard({ show }: { show: Show }) {
  return (
    <Link
      to="/watch/$showId/$ep"
      params={{ showId: show.id, ep: "1" }}
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
