import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SHOWS } from "@/lib/shows";
import { ShowCard } from "@/components/ShowCard";
import { useAuth } from "@/lib/auth";
import { useWidget } from "@/lib/widget-context";
import { supabase } from "@/integrations/supabase/client";
import { Play } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { user } = useAuth();
  const { activePartyId } = useWidget();
  const nav = useNavigate();
  const [lastWatched, setLastWatched] = useState<{ show_id: string; episode: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("watch_history").select("show_id, episode").eq("user_id", user.id).order("watched_at", { ascending: false }).limit(1).maybeSingle().then(({ data }) => setLastWatched(data));
  }, [user]);

  const featured = lastWatched ? SHOWS.find((s) => s.id === lastWatched.show_id) : null;
  const heroShow = featured || SHOWS[0];
  const heroEp = featured?.id === lastWatched?.show_id ? lastWatched!.episode : 1;
  const isContinue = !!featured;

  // If user is in a party but on home, give them quick rejoin
  // (party panel handles itself)
  return (
    <main className="min-h-screen pr-0 lg:pr-[230px]">
      {/* Hero */}
      <section
        className="relative h-[60vh] min-h-[420px] flex items-end"
        style={{ background: heroShow.cover }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
        <div className="relative z-10 px-8 pb-12 max-w-2xl">
          <div className="text-xs font-medium uppercase tracking-widest text-primary mb-3">
            {isContinue ? "Continue Watching" : "Featured"}
          </div>
          <h1 className="text-5xl font-bold mb-3">{heroShow.title}</h1>
          <p className="text-muted-foreground mb-6 max-w-lg">{heroShow.description}</p>
          <div className="flex items-center gap-3">
            {user ? (
              <button
                onClick={() => nav({ to: "/watch/$showId/$ep", params: { showId: heroShow.id, ep: String(heroEp) } })}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-semibold hover:opacity-90 transition"
              >
                <Play className="h-4 w-4 fill-current" />
                {isContinue ? `Resume Ep ${heroEp}` : "Watch Now"}
              </button>
            ) : (
              <Link to="/login" className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-semibold">
                <Play className="h-4 w-4 fill-current" /> Sign in to watch
              </Link>
            )}
            <div className="text-xs text-muted-foreground">{heroShow.genre} · {heroShow.episodes} eps</div>
          </div>
        </div>
      </section>

      {/* Popular */}
      <section className="px-8 py-10">
        <h2 className="text-xl font-bold mb-5">Popular This Week</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {SHOWS.map((s) => <ShowCard key={s.id} show={s} />)}
        </div>
      </section>
    </main>
  );
}
