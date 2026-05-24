import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useWidget } from "@/lib/widget-context";
import { Avatar } from "@/components/Avatar";
import { Lock, Unlock, Plus, Send, LogOut } from "lucide-react";

export function PartyPanel({ partyId }: { partyId: string }) {
  const { user, profile } = useAuth();
  const { setView, setActivePartyId } = useWidget();
  const [party, setParty] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);

  const reload = async () => {
    const { data: p } = await supabase.from("watch_parties").select("*").eq("id", partyId).maybeSingle();
    setParty(p);
    const { data: pm } = await supabase.from("party_members").select("*").eq("party_id", partyId);
    if (pm && pm.length) {
      const { data: profs } = await supabase.from("profiles").select("id, username, avatar_color").in("id", pm.map((m) => m.user_id));
      const byId: Record<string, any> = {};
      (profs || []).forEach((p) => byId[p.id] = p);
      setMembers(pm.map((m) => ({ ...m, profile: byId[m.user_id] })));
    } else setMembers([]);
    const { data: msgs } = await supabase.from("party_messages").select("*").eq("party_id", partyId).order("created_at", { ascending: true });
    setMessages(msgs || []);
  };

  useEffect(() => {
    reload();
    const ch = supabase
      .channel(`party-${partyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "watch_parties", filter: `id=eq.${partyId}` }, () => reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "party_members", filter: `party_id=eq.${partyId}` }, () => reload())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "party_messages", filter: `party_id=eq.${partyId}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [partyId]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    if (!inviteOpen || !user) return;
    (async () => {
      const { data: fr } = await supabase.from("friendships").select("friend_id").eq("user_id", user.id);
      const ids = (fr || []).map((r) => r.friend_id);
      if (!ids.length) { setFriends([]); return; }
      const existing = new Set(members.map((m) => m.user_id));
      const eligible = ids.filter((i) => !existing.has(i));
      if (!eligible.length) { setFriends([]); return; }
      const { data: profs } = await supabase.from("profiles").select("id, username, avatar_color").in("id", eligible);
      setFriends(profs || []);
    })();
  }, [inviteOpen, user, members]);

  const send = async () => {
    if (!text.trim() || !user || !profile) return;
    await supabase.from("party_messages").insert({ party_id: partyId, user_id: user.id, username: profile.username, content: text.trim() });
    setText("");
  };

  const toggleLock = async () => {
    if (!party || !user) return;
    await supabase.from("watch_parties").update({ controls_locked: !party.controls_locked }).eq("id", partyId);
  };

  const leave = async () => {
    if (!user) return;
    await supabase.from("party_messages").insert({ party_id: partyId, content: `${profile?.username || "Someone"} left the party`, is_system: true, username: profile?.username });
    await supabase.from("party_members").delete().eq("party_id", partyId).eq("user_id", user.id);
    if (party?.host_id === user.id) {
      await supabase.from("watch_parties").update({ status: "ended" }).eq("id", partyId);
    }
    setActivePartyId(null);
    setView({ kind: "main" });
  };

  const invite = async (id: string) => {
    if (members.length >= 6) return;
    await supabase.from("party_members").insert({ party_id: partyId, user_id: id, status: "invited" });
    setInviteOpen(false);
  };

  if (!party) return <div className="p-4 text-sm text-muted-foreground">Loading party…</div>;
  const isHost = party.host_id === user?.id;
  const joinedMembers = members.filter((m) => m.status === "joined");

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Watching together</div>
        <div className="text-sm font-semibold truncate">{party.show_title}</div>
        <div className="text-xs text-muted-foreground">Episode {party.episode}</div>
      </div>

      <div className="p-3 border-b border-border">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Members · {joinedMembers.length}/6</div>
        <div className="grid grid-cols-3 gap-2">
          {joinedMembers.map((m) => {
            const isHostMember = m.user_id === party.host_id;
            return (
              <div key={m.user_id} className="flex flex-col items-center gap-1">
                {isHostMember && <div className="text-xs">👑</div>}
                <Avatar name={m.profile?.username || "?"} color={m.profile?.avatar_color} size={36} ring={isHostMember ? "host" : "synced"} />
                <div className="text-[10px] text-center truncate w-full">{m.profile?.username}</div>
              </div>
            );
          })}
          {joinedMembers.length < 6 && (
            <button onClick={() => setInviteOpen(true)} className="flex flex-col items-center gap-1">
              <div className="w-9 h-9 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary"><Plus className="h-4 w-4" /></div>
              <div className="text-[10px] text-muted-foreground">Invite</div>
            </button>
          )}
        </div>
      </div>

      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="text-xs text-muted-foreground">Controls: <span className={party.controls_locked ? "text-primary font-medium" : "text-foreground"}>{party.controls_locked ? "Locked" : "Open"}</span></div>
        {isHost && (
          <button onClick={toggleLock} className="p-1.5 rounded hover:bg-accent" title={party.controls_locked ? "Unlock" : "Lock"}>
            {party.controls_locked ? <Lock className="h-4 w-4 text-primary" /> : <Unlock className="h-4 w-4" />}
          </button>
        )}
      </div>

      <div ref={chatRef} className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {messages.map((m) => (
          m.is_system ? (
            <div key={m.id} className="text-[10px] text-center text-muted-foreground py-1">{m.content}</div>
          ) : (
            <div key={m.id} className="flex gap-2 text-xs">
              <Avatar name={m.username || "?"} color={members.find((x) => x.user_id === m.user_id)?.profile?.avatar_color} size={20} />
              <div className="min-w-0 flex-1">
                <span className="font-medium text-[11px]">{m.username}</span>{" "}
                <span className="text-foreground/90 break-words">{m.content}</span>
              </div>
            </div>
          )
        ))}
      </div>

      <div className="p-2 border-t border-border flex items-center gap-1">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message party..."
          className="flex-1 bg-background border border-border rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-primary"
        />
        <button onClick={send} className="p-2 bg-primary text-primary-foreground rounded-md"><Send className="h-4 w-4" /></button>
      </div>

      <button onClick={leave} className="p-3 text-xs text-destructive hover:bg-accent border-t border-border flex items-center justify-center gap-1.5">
        <LogOut className="h-3 w-3" /> Leave Party
      </button>

      {inviteOpen && (
        <div className="absolute inset-0 bg-card flex flex-col z-10">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <div className="font-semibold text-sm">Invite Friends</div>
            <button onClick={() => setInviteOpen(false)} className="text-xs text-muted-foreground">Close</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {friends.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">No more friends to invite</div>
            ) : friends.map((f) => (
              <button key={f.id} onClick={() => invite(f.id)} className="w-full flex items-center gap-2 p-3 hover:bg-accent text-left">
                <Avatar name={f.username} color={f.avatar_color} size={32} />
                <div className="flex-1 text-sm">{f.username}</div>
                <span className="text-xs text-primary">Invite</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
