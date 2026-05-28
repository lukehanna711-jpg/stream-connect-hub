import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SHOWS } from "@/lib/shows";
import { ShowCard } from "@/components/ShowCard";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Play, Info, Flame, Sparkles, Clock } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [recent, setRecent] = useState<Array<{ show_id: string; episode: number }>>([]);

  useEffect(() => {
    if (!user) { setRecent([]); return; }
    supabase
      .from("watch_history")
      .select("show_id, episode, watched_at")
      .eq("user_id", user.id)
      .order("watched_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        // dedupe by show_id, keep most recent episode
        const seen = new Set<string>();
        const out: Array<{ show_id: string; episode: number }> = [];
        (data || []).forEach((r: any) => {
          if (seen.has(r.show_id)) return;
          seen.add(r.show_id);
          out.push({ show_id: r.show_id, episode: r.episode });
        });
        setRecent(out.slice(0, 6));
      });
  }, [user]);

  const continueShows = recent.map((r) => ({ ...SHOWS.find((s) => s.id === r.show_id)!, _ep: r.episode })).filter((s) => s.id);
  const heroShow = continueShows[0] || SHOWS[0];
  const heroEp = (heroShow as any)._ep || 1;
  const isContinue = continueShows.length > 0;

  const trending = SHOWS.slice(0, 6);
  const newReleases = SHOWS.slice(6);

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section
        className="relative h-[65vh] min-h-[460px] flex items-end"
        style={{ background: heroShow.cover }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/30 to-transparent" />
        <div className="relative z-10 px-8 pb-14 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4">
            <span className="w-8 h-px bg-primary" />
            {isContinue ? "Continue Watching" : "Featured Today"}
          </div>
          <h1 className="text-6xl font-bold mb-4 leading-none tracking-tight">{heroShow.title}</h1>
          <p className="text-muted-foreground mb-6 max-w-lg text-base">{heroShow.description}</p>
          <div className="flex items-center gap-3 flex-wrap">
            {user ? (
              <button
                onClick={() => nav({ to: "/watch/$showId/$ep", params: { showId: heroShow.id, ep: String(heroEp) } })}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3 rounded-md font-semibold hover:opacity-90 transition shadow-lg shadow-primary/30"
              >
                <Play className="h-4 w-4 fill-current" />
                {isContinue ? `Resume Ep ${heroEp}` : "Watch Now"}
              </button>
            ) : (
              <Link to="/login" className="flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3 rounded-md font-semibold shadow-lg shadow-primary/30">
                <Play className="h-4 w-4 fill-current" /> Sign in to watch
              </Link>
            )}
            <button className="flex items-center gap-2 bg-card/80 backdrop-blur border border-border text-foreground px-5 py-3 rounded-md font-medium hover:bg-card transition">
              <Info className="h-4 w-4" /> More Info
            </button>
            <div className="text-xs text-muted-foreground ml-2">{heroShow.genre} · {heroShow.episodes} eps</div>
          </div>
        </div>
      </section>

      {/* Continue Watching */}
      {continueShows.length > 0 && (
        <Row icon={<Clock className="h-4 w-4 text-primary" />} title="Continue Watching">
          {continueShows.map((s) => <ShowCard key={s.id} show={s} episode={(s as any)._ep} />)}
        </Row>
      )}

      {/* Trending */}
      <Row icon={<Flame className="h-4 w-4 text-primary" />} title="Trending Now">
        {trending.map((s) => <ShowCard key={s.id} show={s} />)}
      </Row>

      {/* New */}
      <Row icon={<Sparkles className="h-4 w-4 text-primary" />} title="New Releases">
        {newReleases.map((s) => <ShowCard key={s.id} show={s} />)}
      </Row>

      <footer className="px-8 py-10 border-t border-border mt-6">
        <div className="text-xs text-muted-foreground">
          StreamX is a demo · The social widget on the right is a white-label addon for streaming platforms.
        </div>
      </footer>
    </main>
  );
}

function Row({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="px-8 py-6">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {children}
      </div>
    </section>
  );
}
