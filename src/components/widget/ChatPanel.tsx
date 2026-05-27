import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useWidget } from "@/lib/widget-context";
import { Avatar } from "@/components/Avatar";
import { ArrowLeft, MoreVertical, Send, Film, X } from "lucide-react";
import { SHOWS, getShow } from "@/lib/shows";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

export function ChatPanel({ friendId }: { friendId: string }) {
  const { user } = useAuth();
  const { setView, onlineIds } = useWidget();
  const [friend, setFriend] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("profiles").select("id, username, avatar_color").eq("id", friendId).maybeSingle().then(({ data }) => setFriend(data));
  }, [friendId]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`and(from_user.eq.${user.id},to_user.eq.${friendId}),and(from_user.eq.${friendId},to_user.eq.${user.id})`)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel(`dm-${user.id}-${friendId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, (payload) => {
        const m: any = payload.new;
        if ((m.from_user === user.id && m.to_user === friendId) || (m.from_user === friendId && m.to_user === user.id)) {
          setMessages((prev) => [...prev, m]);
        }
      })
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [user, friendId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const send = async (content: string, show_rec?: any) => {
    if (!user) return;
    if (!content && !show_rec) return;
    const { error } = await supabase
      .from("direct_messages")
      .insert({ from_user: user.id, to_user: friendId, content, show_rec });
    if (error) {
      toast.error("Failed to send message. Please try again.");
      return;
    }
    if (content) setText("");
  };

  const block = async () => {
    if (!user) return;
    await supabase.from("blocks").insert({ user_id: user.id, blocked_id: friendId });
    await supabase.from("friendships").delete().eq("user_id", user.id).eq("friend_id", friendId);
    await supabase.from("friendships").delete().eq("user_id", friendId).eq("friend_id", user.id);
    toast.success("User blocked");
    setView({ kind: "main" });
  };

  const report = async () => {
    if (!user) return;
    await supabase.from("blocks").insert({ user_id: user.id, blocked_id: friendId, reason: "reported from chat" });
    toast.success("User reported");
    setView({ kind: "main" });
  };

  if (!friend) return null;
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border flex items-center gap-2">
        <button onClick={() => setView({ kind: "main" })}><ArrowLeft className="h-4 w-4" /></button>
        <Avatar name={friend.username} color={friend.avatar_color} size={32} online={onlineIds.has(friend.id)} />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{friend.username}</div>
          <div className="text-[10px] text-muted-foreground">{onlineIds.has(friend.id) ? "Online" : "Offline"}</div>
        </div>
        <div className="relative">
          <button onClick={() => setMenuOpen((o) => !o)}><MoreVertical className="h-4 w-4" /></button>
          {menuOpen && (
            <div className="absolute right-0 top-6 bg-card border border-border rounded-md w-32 z-10 overflow-hidden">
              <button onClick={block} className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent text-destructive">Block</button>
              <button onClick={report} className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent text-destructive">Report</button>
            </div>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((m) => {
          const mine = m.from_user === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg px-2.5 py-1.5 text-xs ${mine ? "bg-primary text-primary-foreground" : "bg-accent"}`}>
                {m.show_rec ? (
                  <Link
                    to="/watch/$showId/$ep"
                    params={{ showId: m.show_rec.id, ep: "1" }}
                    className="flex items-center gap-2 group"
                  >
                    <div className="w-9 h-12 rounded shrink-0" style={{ background: m.show_rec.cover }} />
                    <div className="min-w-0">
                      <div className="text-[10px] opacity-80">📺 Recommended a show</div>
                      <div className="font-medium truncate group-hover:underline">{m.show_rec.title}</div>
                    </div>
                  </Link>
                ) : (
                  m.content
                )}
              </div>
            </div>
          );
        })}
        {messages.length === 0 && <div className="text-center text-xs text-muted-foreground py-8">Say hi 👋</div>}
      </div>

      {showPicker && (
        <div className="border-t border-border bg-background max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-2 sticky top-0 bg-background border-b border-border">
            <div className="text-xs font-medium">Recommend a Show</div>
            <button onClick={() => setShowPicker(false)}><X className="h-3 w-3" /></button>
          </div>
          {SHOWS.map((s) => (
            <button
              key={s.id}
              onClick={() => { send("", { id: s.id, title: s.title, cover: s.cover }); setShowPicker(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent text-left"
            >
              <div className="w-7 h-9 rounded" style={{ background: s.cover }} />
              <div className="text-xs">{s.title}</div>
            </button>
          ))}
        </div>
      )}

      <div className="p-2 border-t border-border flex items-center gap-1">
        <button onClick={() => setShowPicker((s) => !s)} className="p-2 hover:bg-accent rounded-md" title="Recommend a show">
          <Film className="h-4 w-4" />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(text)}
          placeholder="Message..."
          className="flex-1 bg-background border border-border rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-primary"
        />
        <button onClick={() => send(text)} className="p-2 bg-primary text-primary-foreground rounded-md">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
