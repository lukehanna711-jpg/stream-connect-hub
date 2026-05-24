import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/Avatar";
import { Search, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export function AddFriendModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [result, setResult] = useState<any | null | "none">(null);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) { setQ(""); setResult(null); }
  }, [open]);

  const search = async () => {
    const name = q.trim();
    if (!name) return;
    setSearching(true);
    setResult(null);
    const { data } = await supabase.from("profiles").select("id, username, avatar_color, favourite_show, member_since").eq("username", name).maybeSingle();
    setSearching(false);
    if (!data || data.id === user?.id) {
      setResult("none");
    } else {
      setResult(data);
    }
  };

  const sendRequest = async () => {
    if (!result || result === "none" || !user) return;
    setSending(true);
    const { error } = await supabase.from("friend_requests").insert({ from_user: user.id, to_user: result.id, status: "pending" });
    setSending(false);
    if (error) {
      if (error.code === "23505") toast.error("Request already sent");
      else toast.error(error.message);
    } else {
      toast.success(`Friend request sent to ${result.username}`);
      onClose();
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Add a Friend</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Type the exact username. No partial matches.</p>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="username"
            className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
            autoFocus
          />
          <button onClick={search} disabled={searching} className="px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm">
            <Search className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 min-h-[80px]">
          {result === "none" && <div className="text-sm text-muted-foreground text-center py-4">No user found</div>}
          {result && result !== "none" && (
            <div className="bg-background border border-border rounded-md p-3 flex items-center gap-3">
              <Avatar name={result.username} color={result.avatar_color} size={44} />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{result.username}</div>
                <div className="text-xs text-muted-foreground truncate">{result.favourite_show || "No favourite show"}</div>
              </div>
              <button onClick={sendRequest} disabled={sending} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md font-medium">
                Send Request
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
