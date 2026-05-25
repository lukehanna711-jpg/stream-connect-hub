import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useWidget } from "@/lib/widget-context";
import { Avatar } from "@/components/Avatar";
import { Star, UserPlus, MessageCircle, Users, Check, X, Bell } from "lucide-react";
import { AddFriendModal } from "./AddFriendModal";
import { StartPartyModal } from "./StartPartyModal";
import { SHOWS, getShow } from "@/lib/shows";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export function MainPanel() {
  const { user, profile, refresh } = useAuth();
  const { setView, onlineIds, setActivePartyId } = useWidget();
  const nav = useNavigate();
  const [stats, setStats] = useState({ episodes: 0, series: 0, hours: 0 });
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [partyInvites, setPartyInvites] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showStart, setShowStart] = useState(false);
  const [showFavPicker, setShowFavPicker] = useState(false);

  const loadAll = async () => {
    if (!user) return;
    // stats
    const { data: hist } = await supabase.from("watch_history").select("show_id, episode").eq("user_id", user.id);
    const eps = new Set<string>();
    const series = new Set<string>();
    (hist || []).forEach((r) => { eps.add(`${r.show_id}-${r.episode}`); series.add(r.show_id); });
    setStats({ episodes: eps.size, series: series.size, hours: Math.round((eps.size * 24) / 60) });

    // friends
    const { data: fr } = await supabase.from("friendships").select("friend_id").eq("user_id", user.id);
    const ids = (fr || []).map((r) => r.friend_id);
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, username, avatar_color, last_watched_show, last_watched_private").in("id", ids);
      setFriends(profs || []);
    } else {
      setFriends([]);
    }

    // requests
    const { data: rq } = await supabase.from("friend_requests").select("id, from_user, created_at").eq("to_user", user.id).eq("status", "pending");
    if (rq && rq.length) {
      const { data: profs } = await supabase.from("profiles").select("id, username, avatar_color").in("id", rq.map((r) => r.from_user));
      const byId: Record<string, any> = {};
      (profs || []).forEach((p) => byId[p.id] = p);
      setRequests(rq.map((r) => ({ ...r, profile: byId[r.from_user] })));
    } else setRequests([]);

    // party invites
    const { data: invites } = await supabase
      .from("party_members")
      .select("party_id, watch_parties(id, show_title, episode, host_id, status)")
      .eq("user_id", user.id)
      .eq("status", "invited");
    const active = (invites || []).filter((i: any) => i.watch_parties?.status === "active");
    if (active.length) {
      const hostIds = active.map((i: any) => i.watch_parties.host_id);
      const { data: hosts } = await supabase.from("profiles").select("id, username").in("id", hostIds);
      const byId: Record<string, any> = {};
      (hosts || []).forEach((p) => byId[p.id] = p);
      setPartyInvites(active.map((i: any) => ({ ...i, host: byId[i.watch_parties.host_id] })));
    } else setPartyInvites([]);
  };

  useEffect(() => {
    loadAll();
    if (!user) return;
    const ch = supabase
      .channel(`user-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "party_members", filter: `user_id=eq.${user.id}` }, () => loadAll())
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [user]);

  const acceptRequest = async (req: any) => {
    if (!user) return;
    await supabase.from("friend_requests").update({ status: "accepted" }).eq("id", req.id);
    await supabase.from("friendships").insert([
      { user_id: user.id, friend_id: req.from_user },
      { user_id: req.from_user, friend_id: user.id },
    ]);
    toast.success(`You're now friends with ${req.profile?.username}`);
  };

  const declineRequest = async (req: any) => {
    await supabase.from("friend_requests").update({ status: "declined" }).eq("id", req.id);
  };

  const acceptParty = async (invite: any) => {
    if (!user) return;
    await supabase.from("party_members").update({ status: "joined", joined_at: new Date().toISOString() }).eq("party_id", invite.party_id).eq("user_id", user.id);
    const show = SHOWS.find((s) => s.title === invite.watch_parties.show_title);
    setActivePartyId(invite.party_id);
    if (show) nav({ to: "/watch/$showId/$ep", params: { showId: show.id, ep: String(invite.watch_parties.episode) } });
  };

  const declineParty = async (invite: any) => {
    if (!user) return;
    await supabase.from("party_members").update({ status: "declined" }).eq("party_id", invite.party_id).eq("user_id", user.id);
  };

  const setFavourite = async (showId: string) => {
    if (!user) return;
    const show = getShow(showId);
    await supabase.from("profiles").update({ favourite_show: show?.title }).eq("id", user.id);
    await refresh();
    setShowFavPicker(false);
  };

  const onlineCount = friends.filter((f) => onlineIds.has(f.id)).length;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Profile */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Avatar name={profile?.username || "?"} color={profile?.avatar_color} size={48} online />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm truncate">{profile?.username}</div>
            <div className="text-[10px] text-muted-foreground">
              Since {profile?.member_since ? new Date(profile.member_since).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "—"}
            </div>
          </div>
        </div>
        <button onClick={() => setShowFavPicker((s) => !s)} className="mt-3 w-full text-left flex items-center gap-2 text-xs bg-background border border-border rounded-md px-2 py-1.5 hover:border-primary">
          <Star className="h-3 w-3 text-primary" />
          <span className="text-muted-foreground">Favourite:</span>
          <span className="truncate flex-1">{profile?.favourite_show || "Choose a show"}</span>
        </button>
        {showFavPicker && (
          <div className="mt-1 bg-background border border-border rounded-md max-h-40 overflow-y-auto">
            {SHOWS.map((s) => (
              <button key={s.id} onClick={() => setFavourite(s.id)} className="w-full text-left px-2 py-1.5 text-xs hover:bg-accent">{s.title}</button>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="p-3 border-b border-border grid grid-cols-3 gap-2">
        <Stat label="Episodes" value={stats.episodes} />
        <Stat label="Series" value={stats.series} />
        <Stat label="Hours" value={`${stats.hours}h`} />
      </div>

      {/* Party invites */}
      {partyInvites.map((inv) => (
        <div key={inv.party_id} className="p-3 border-b border-border bg-primary/10">
          <div className="flex items-center gap-1.5 text-[10px] text-primary font-medium mb-1">
            <Bell className="h-3 w-3" /> PARTY INVITE
          </div>
          <div className="text-xs"><span className="font-medium">{inv.host?.username}</span> invited you to watch</div>
          <div className="text-xs font-semibold truncate">{inv.watch_parties.show_title} · Ep {inv.watch_parties.episode}</div>
          <div className="flex gap-1 mt-2">
            <button onClick={() => acceptParty(inv)} className="flex-1 text-xs bg-primary text-primary-foreground rounded py-1 font-medium">Join</button>
            <button onClick={() => declineParty(inv)} className="flex-1 text-xs bg-accent rounded py-1">Decline</button>
          </div>
        </div>
      ))}

      {/* Friend requests */}
      {requests.length > 0 && (
        <div className="p-3 border-b border-border">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
            <Bell className="h-3 w-3" /> Friend Requests · {requests.length}
          </div>
          <div className="space-y-1.5">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center gap-2 bg-background rounded-md p-1.5">
                <Avatar name={r.profile?.username || "?"} color={r.profile?.avatar_color} size={28} />
                <div className="flex-1 text-xs truncate">{r.profile?.username}</div>
                <button onClick={() => acceptRequest(r)} className="p-1 bg-primary/20 text-primary rounded"><Check className="h-3 w-3" /></button>
                <button onClick={() => declineRequest(r)} className="p-1 bg-accent rounded"><X className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends */}
      <div className="p-3 flex-1">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Friends · <span className="text-online">{onlineCount} online</span>
          </div>
          <button onClick={() => setShowAdd(true)} className="p-1 hover:bg-accent rounded" title="Add friend">
            <UserPlus className="h-3.5 w-3.5 text-primary" />
          </button>
        </div>
        {friends.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-6 px-2">
            <div className="mb-2">No friends yet.</div>
            <Link to="/settings" className="inline-block text-primary hover:underline text-[11px]">
              ✨ Seed demo friends
            </Link>
            <div className="mt-1 text-[10px]">or click <UserPlus className="h-3 w-3 inline text-primary" /> to add one.</div>
          </div>
        ) : (
          <div className="space-y-1">
            {friends.sort((a, b) => +onlineIds.has(b.id) - +onlineIds.has(a.id)).map((f) => {
              const online = onlineIds.has(f.id);
              const lastShow = f.last_watched_private ? "Watching privately" : f.last_watched_show;
              return (
                <div key={f.id} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-accent group">
                  <Avatar name={f.username} color={f.avatar_color} size={32} online={online} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">{f.username}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {lastShow ? `${online ? "Watching" : "Last"}: ${lastShow}` : (online ? "Online" : "Offline")}
                    </div>
                  </div>
                  <button onClick={() => setView({ kind: "chat", friendId: f.id })} className="p-1 opacity-0 group-hover:opacity-100 transition hover:bg-background rounded" title="Message">
                    <MessageCircle className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Start watch party */}
      <div className="p-3 border-t border-border">
        <button onClick={() => setShowStart(true)} className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md py-2 text-sm font-semibold hover:opacity-90 transition">
          <Users className="h-4 w-4" /> Start Watch Party
        </button>
      </div>

      <AddFriendModal open={showAdd} onClose={() => setShowAdd(false)} />
      <StartPartyModal
        open={showStart}
        onClose={() => setShowStart(false)}
        onStarted={(pid) => {
          setActivePartyId(pid);
          // navigate host to watch
          supabase.from("watch_parties").select("show_id, episode").eq("id", pid).maybeSingle().then(({ data }) => {
            if (data) nav({ to: "/watch/$showId/$ep", params: { showId: data.show_id, ep: String(data.episode) } });
          });
        }}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-background border border-border rounded-md p-2 text-center">
      <div className="text-base font-bold text-primary">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
