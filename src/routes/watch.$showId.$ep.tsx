import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { getShow, EPISODE_MINUTES } from "@/lib/shows";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useWidget } from "@/lib/widget-context";
import { Play, Pause, SkipBack, SkipForward, Maximize2, ArrowLeft, Users, ChevronLeft, ChevronRight, Crown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/watch/$showId/$ep")({
  component: WatchPage,
});

function WatchPage() {
  const { showId, ep } = Route.useParams();
  const episode = parseInt(ep, 10) || 1;
  const show = getShow(showId);
  const { user, profile } = useAuth();
  const { activePartyId } = useWidget();
  const nav = useNavigate();
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [party, setParty] = useState<any>(null);
  const totalSec = EPISODE_MINUTES * 60;
  const tickRef = useRef<number | null>(null);
  const applyingRemoteRef = useRef(false);

  // log watch history
  useEffect(() => {
    if (!user || !show) return;
    supabase.from("watch_history").insert({ user_id: user.id, show_id: show.id, show_title: show.title, episode });
    supabase.from("profiles").update({ last_watched_show: show.title }).eq("id", user.id);
  }, [user, show, episode]);

  // Subscribe to party state when in party
  useEffect(() => {
    if (!activePartyId) { setParty(null); return; }
    const load = async () => {
      const { data } = await supabase.from("watch_parties").select("*").eq("id", activePartyId).maybeSingle();
      if (data) {
        setParty(data);
        applyingRemoteRef.current = true;
        setIsPlaying(data.is_playing);
        setCurrentTime(data.current_time_sec);
        setTimeout(() => { applyingRemoteRef.current = false; }, 50);
      }
    };
    load();
    const ch = supabase
      .channel(`watch-party-${activePartyId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "watch_parties", filter: `id=eq.${activePartyId}` }, (payload: any) => {
        const p = payload.new;
        setParty(p);
        applyingRemoteRef.current = true;
        setIsPlaying(p.is_playing);
        setCurrentTime(p.current_time_sec);
        setTimeout(() => { applyingRemoteRef.current = false; }, 50);
      })
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [activePartyId, user?.id]);

  // tick
  useEffect(() => {
    if (!isPlaying) { if (tickRef.current) window.clearInterval(tickRef.current); return; }
    tickRef.current = window.setInterval(() => {
      setCurrentTime((t) => Math.min(totalSec, t + 1));
    }, 1000);
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  }, [isPlaying, totalSec]);

  const canControl = !party || party.host_id === user?.id || !party.controls_locked;

  const broadcast = async (action: string, patch: any) => {
    if (!party || !user) return;
    if (party.controls_locked && party.host_id !== user.id) return;
    await supabase.from("watch_parties").update({
      ...patch,
      updated_at: new Date().toISOString(),
    }).eq("id", party.id);
  };

  const togglePlay = () => {
    if (!canControl) { toast.error("Host has locked controls"); return; }
    const next = !isPlaying;
    setIsPlaying(next);
    if (party) {
      // include who/what so others see a toast (rough)
      supabase.from("watch_parties").update({ is_playing: next, current_time_sec: currentTime }).eq("id", party.id);
      supabase.from("party_messages").insert({
        party_id: party.id, user_id: user!.id, username: profile?.username,
        content: next ? "▶ resumed" : "⏸ paused", is_system: true,
      });
    }
  };

  const seek = (delta: number) => {
    if (!canControl) { toast.error("Host has locked controls"); return; }
    const next = Math.max(0, Math.min(totalSec, currentTime + delta));
    setCurrentTime(next);
    if (party) supabase.from("watch_parties").update({ current_time_sec: next }).eq("id", party.id);
  };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  if (!show) return <div className="p-12 text-center">Show not found</div>;

  const inParty = !!party;

  return (
    <main className="min-h-screen bg-black">
      <div className="relative">
        <button onClick={() => nav({ to: "/" })} className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/60 hover:bg-black/80 backdrop-blur rounded-md px-3 py-1.5 text-sm">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {inParty && (
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-primary/90 rounded-md px-3 py-1.5 text-xs font-medium">
            {party.host_id === user?.id ? <Crown className="h-3 w-3" /> : <Users className="h-3 w-3" />}
            {party.host_id === user?.id ? "You're hosting" : "Watch Party"}
            {party.controls_locked && <span className="ml-1">🔒</span>}
          </div>
        )}

        {/* "Video" */}
        <div className="aspect-video w-full bg-black flex items-center justify-center relative overflow-hidden" style={{ background: show.cover }}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative text-center">
            <div className="text-5xl font-bold text-white mb-2">{show.title}</div>
            <div className="text-lg text-white/70">Episode {episode}</div>
            <div className="mt-6 text-xs text-white/40 uppercase tracking-widest">Mock player · demo</div>
          </div>
        </div>

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4">
          <div className="w-full h-1 bg-white/20 rounded mb-3 cursor-pointer" onClick={(e) => {
            if (!canControl) return;
            const rect = (e.target as HTMLDivElement).getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            const next = Math.floor(pct * totalSec);
            setCurrentTime(next);
            if (party) supabase.from("watch_parties").update({ current_time_sec: next }).eq("id", party.id);
          }}>
            <div className="h-full bg-primary rounded" style={{ width: `${(currentTime / totalSec) * 100}%` }} />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => seek(-10)} className="text-white hover:text-primary"><SkipBack className="h-5 w-5" /></button>
            <button onClick={togglePlay} className="text-white hover:text-primary">
              {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7" />}
            </button>
            <button onClick={() => seek(10)} className="text-white hover:text-primary"><SkipForward className="h-5 w-5" /></button>
            <div className="text-xs text-white/70 ml-2">{fmt(currentTime)} / {fmt(totalSec)}</div>
            <div className="ml-auto">
              <Maximize2 className="h-4 w-4 text-white/60" />
            </div>
          </div>
          {inParty && party.controls_locked && party.host_id !== user?.id && (
            <div className="text-xs text-primary mt-2">🔒 Host has locked playback controls</div>
          )}
        </div>
      </div>

      <div className="p-8">
        <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Now playing</div>
        <h1 className="text-2xl font-bold">{show.title} · Episode {episode}</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">{show.description}</p>
        <div className="mt-6 flex items-center gap-2">
          {episode > 1 && (
            <button
              onClick={() => nav({ to: "/watch/$showId/$ep", params: { showId: show.id, ep: String(episode - 1) } })}
              className="flex items-center gap-1.5 bg-card border border-border hover:border-primary rounded-md px-3 py-2 text-sm"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
          )}
          {episode < show.episodes && (
            <button
              onClick={() => nav({ to: "/watch/$showId/$ep", params: { showId: show.id, ep: String(episode + 1) } })}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm font-medium"
            >
              Next Episode <ChevronRight className="h-4 w-4" />
            </button>
          )}
          <div className="text-xs text-muted-foreground ml-2">Episode {episode} of {show.episodes}</div>
        </div>
      </div>
    </main>
  );
}
