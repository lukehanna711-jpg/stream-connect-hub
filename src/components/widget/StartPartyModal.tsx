import { useEffect, useState } from "react";
import { X, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { SHOWS, getShow } from "@/lib/shows";
import { Avatar } from "@/components/Avatar";
import { toast } from "sonner";

export function StartPartyModal({ open, onClose, onStarted }: { open: boolean; onClose: () => void; onStarted: (partyId: string) => void }) {
  const { user, profile } = useAuth();
  const [showId, setShowId] = useState(SHOWS[0].id);
  const [episode, setEpisode] = useState(1);
  const [friends, setFriends] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<"pick" | "invite">("pick");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setStep("pick");
    setSelected(new Set());
    setShowId(SHOWS[0].id);
    setEpisode(1);
    (async () => {
      const { data: ids } = await supabase.from("friendships").select("friend_id").eq("user_id", user.id);
      if (!ids || ids.length === 0) {
        setFriends([]);
        return;
      }
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, avatar_color, is_subscribed")
        .in("id", ids.map((r) => r.friend_id));
      setFriends(profs || []);
    })();
  }, [open, user]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else if (next.size < 5) next.add(id);
    setSelected(next);
  };

  const start = async () => {
    if (!user || !profile) return;
    // Subscription check: at least half subscribed (including host)
    const invitedProfiles = friends.filter((f) => selected.has(f.id));
    const total = invitedProfiles.length + 1;
    const subscribed = (profile.is_subscribed ? 1 : 0) + invitedProfiles.filter((p) => p.is_subscribed).length;
    if (subscribed * 2 < total) {
      toast.error("At least half of your party must be subscribed to use Watch Party");
      return;
    }
    setWorking(true);
    const show = getShow(showId)!;
    const { data: party, error } = await supabase
      .from("watch_parties")
      .insert({ host_id: user.id, show_id: showId, show_title: show.title, episode, status: "active" })
      .select()
      .single();
    if (error || !party) { toast.error(error?.message || "Failed"); setWorking(false); return; }
    // Host joins
    await supabase.from("party_members").insert({ party_id: party.id, user_id: user.id, status: "joined", joined_at: new Date().toISOString() });
    // Invite friends
    if (selected.size) {
      await supabase.from("party_members").insert(Array.from(selected).map((id) => ({ party_id: party.id, user_id: id, status: "invited" })));
    }
    await supabase.from("party_messages").insert({ party_id: party.id, content: `Watch party started by ${profile.username}`, is_system: true, username: profile.username });
    setWorking(false);
    onStarted(party.id);
    onClose();
  };

  if (!open) return null;
  const show = getShow(showId)!;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Start Watch Party</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>

        {step === "pick" && (
          <>
            <label className="text-xs font-medium text-muted-foreground">Show</label>
            <select value={showId} onChange={(e) => { setShowId(e.target.value); setEpisode(1); }} className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm">
              {SHOWS.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
            <label className="text-xs font-medium text-muted-foreground mt-3 block">Episode</label>
            <input type="number" min={1} max={show.episodes} value={episode} onChange={(e) => setEpisode(Math.max(1, Math.min(show.episodes, +e.target.value)))} className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm" />
            <button onClick={() => setStep("invite")} className="w-full mt-4 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium">Next: Invite Friends</button>
          </>
        )}

        {step === "invite" && (
          <>
            <div className="text-xs text-muted-foreground mb-2">Select up to 5 friends ({selected.size}/5)</div>
            {friends.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">No friends yet — add some first.</div>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {friends.map((f) => (
                  <label key={f.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer">
                    <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggle(f.id)} className="accent-primary" />
                    <Avatar name={f.username} color={f.avatar_color} size={32} />
                    <div className="flex-1 text-sm">{f.username}</div>
                    {f.is_subscribed && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">SUB</span>}
                  </label>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setStep("pick")} className="flex-1 bg-accent rounded-md py-2 text-sm">Back</button>
              <button onClick={start} disabled={working} className="flex-1 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium">
                {working ? "Starting..." : "Start Party"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
