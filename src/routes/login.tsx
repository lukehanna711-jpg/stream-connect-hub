import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!username.match(/^[a-zA-Z0-9_]{3,20}$/)) {
          toast.error("Username must be 3-20 chars (letters, numbers, _)");
          setLoading(false); return;
        }
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/`, data: { username } },
        });
        if (error) { toast.error(error.message); setLoading(false); return; }
        toast.success("Account created");
        nav({ to: "/" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { toast.error(error.message); setLoading(false); return; }
        nav({ to: "/" });
      }
    } finally { setLoading(false); }
  };

  const google = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) { toast.error(String(result.error)); setLoading(false); return; }
    if (result.redirected) return;
    nav({ to: "/" });
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 hidden lg:block relative" style={{ background: "linear-gradient(135deg,#ff5500,#7c2d12 60%, #0f0f0f)" }}>
        <div className="absolute inset-0 flex items-end p-12">
          <div>
            <Link to="/" className="text-2xl font-bold mb-6 block">▶ StreamX</Link>
            <h2 className="text-4xl font-bold text-white mb-2">Stream together.</h2>
            <p className="text-white/80 max-w-md">Watch your favourite shows in sync with friends. Built-in chat, watch parties, and more.</p>
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <Link to="/" className="text-2xl font-bold mb-8 block lg:hidden">▶ StreamX</Link>
          <h1 className="text-2xl font-bold mb-1">{mode === "signin" ? "Welcome back" : "Create account"}</h1>
          <p className="text-sm text-muted-foreground mb-6">{mode === "signin" ? "Sign in to continue" : "Join StreamX in seconds"}</p>

          <button onClick={google} disabled={loading} className="w-full flex items-center justify-center gap-2 border border-border bg-card rounded-md py-2.5 text-sm font-medium hover:bg-accent transition mb-3">
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8.18c0-.57-.05-1.12-.14-1.65H9v3.12h4.21c-.18.97-.74 1.79-1.57 2.34v1.94h2.54c1.49-1.37 2.33-3.39 2.33-5.75z"/><path fill="#34A853" d="M9 17c2.12 0 3.9-.7 5.2-1.9l-2.54-1.94c-.7.47-1.6.75-2.66.75-2.05 0-3.78-1.38-4.4-3.24H2v2c1.29 2.56 3.94 4.33 7 4.33z"/><path fill="#FBBC05" d="M4.6 10.67c-.15-.47-.24-.97-.24-1.5s.09-1.03.24-1.5V5.67H2C1.36 6.74 1 7.83 1 9.17s.36 2.43 1 3.5l2.6-2z"/><path fill="#EA4335" d="M9 4.67c1.16 0 2.2.4 3.02 1.18l2.26-2.26C12.9 2.35 11.12 1.67 9 1.67c-3.06 0-5.71 1.77-7 4.33l2.6 2c.62-1.86 2.35-3.33 4.4-3.33z"/></svg>
            Continue with Google
          </button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground my-3">
            <div className="flex-1 h-px bg-border" /> or <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Username</label>
                <input value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} maxLength={20}
                  className="w-full mt-1 bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary" placeholder="anime_lover_42" />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full mt-1 bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                className="w-full mt-1 bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-semibold hover:opacity-90 transition">
              {loading ? "..." : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
          <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-4 text-xs text-muted-foreground hover:text-foreground">
            {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
