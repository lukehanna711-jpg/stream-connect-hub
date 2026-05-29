import { Link, useNavigate } from "@tanstack/react-router";
import { Search, User as UserIcon, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { searchShows } from "@/lib/shows";
import { supabase } from "@/integrations/supabase/client";

export function TopNav() {
  const { profile, user, signOut } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [openProfile, setOpenProfile] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const results = q.trim() ? searchShows(q).slice(0, 6) : [];

  async function goToShow(showId: string, episodes: number) {
    let ep = 1;
    if (user) {
      const { data } = await supabase
        .from("watch_history")
        .select("episode")
        .eq("user_id", user.id)
        .eq("show_id", showId)
        .order("watched_at", { ascending: false })
        .limit(1)
        .single();
      if (data?.episode) {
        ep = Math.min(episodes, data.episode + 1);
      }
    }
    nav({ to: "/watch/$showId/$ep", params: { showId, ep: String(ep) } });
    setQ("");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-16 items-center gap-6 px-6">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl shrink-0">
          <span className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-white text-sm shadow-lg shadow-primary/30">▶</span>
          <span className="bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent tracking-tight">StreamX</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link to="/" className="hover:text-primary transition-colors">Browse</Link>
          <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Simulcast</a>
          <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">News</a>
        </nav>
        <div className="flex-1 max-w-md relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setSearchOpen(true); }}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search shows..."
              className="w-full bg-card border border-border rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          {searchOpen && results.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-md shadow-lg overflow-hidden z-50">
              {results.map((s) => (
                <button
                  key={s.id}
                  onMouseDown={() => { nav({ to: "/watch/$showId/$ep", params: { showId: s.id, ep: "1" } }); setQ(""); }}
                  className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center gap-2"
                >
                  <div className="w-8 h-10 rounded" style={{ background: s.cover }} />
                  <div>
                    <div>{s.title}</div>
                    <div className="text-xs text-muted-foreground">{s.genre}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          {user ? (
            <button onClick={() => setOpenProfile((o) => !o)} className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-white" style={{ background: profile?.avatar_color || "#ff5500" }}>
                {(profile?.username || "?").slice(0, 1).toUpperCase()}
              </div>
            </button>
          ) : (
            <Link to="/login" className="text-sm px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90">Sign in</Link>
          )}
          {openProfile && user && (
            <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-md shadow-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-border">
                <div className="font-medium text-sm">{profile?.username}</div>
                <div className="text-xs text-muted-foreground">{profile?.email}</div>
              </div>
              <button onClick={() => { setOpenProfile(false); nav({ to: "/settings" }); }} className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center gap-2">
                <UserIcon className="h-4 w-4" /> Settings
              </button>
              <button onClick={() => { setOpenProfile(false); signOut(); }} className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center gap-2 text-destructive">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
