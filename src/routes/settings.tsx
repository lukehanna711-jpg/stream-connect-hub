import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { SHOWS } from "@/lib/shows";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";

export const Route = createFileRoute("/settings")({
  component: Settings,
});

function Settings() {
  const { user, profile, refresh } = useAuth();

  if (!user || !profile) {
    return <div className="p-12 text-center text-muted-foreground">Please sign in.</div>;
  }

  const update = async (patch: any) => {
    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); refresh(); }
  };

  return (
    <main className="min-h-screen pr-0 lg:pr-[230px]">
      <div className="max-w-2xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <section className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar name={profile.username} color={profile.avatar_color} size={64} />
            <div>
              <div className="text-xl font-semibold">{profile.username}</div>
              <div className="text-sm text-muted-foreground">{profile.email}</div>
              <div className="text-xs text-muted-foreground mt-1">Member since {new Date(profile.member_since).toLocaleDateString()}</div>
            </div>
          </div>

          <div className="space-y-4">
            <Row label="Favourite Show">
              <select
                value={profile.favourite_show || ""}
                onChange={(e) => update({ favourite_show: e.target.value || null })}
                className="bg-background border border-border rounded-md px-3 py-1.5 text-sm"
              >
                <option value="">— None —</option>
                {SHOWS.map((s) => <option key={s.id} value={s.title}>{s.title}</option>)}
              </select>
            </Row>

            <Row label="Hide Last Watched">
              <Toggle checked={profile.last_watched_private} onChange={(v) => update({ last_watched_private: v })} />
            </Row>

            <Row label="Premium Subscription (demo toggle)">
              <Toggle checked={profile.is_subscribed} onChange={(v) => update({ is_subscribed: v })} />
            </Row>
          </div>
        </section>

        <section className="bg-card border border-border rounded-lg p-6">
          <div className="text-sm font-semibold mb-1">About this demo</div>
          <div className="text-xs text-muted-foreground">
            StreamX is a mock streaming site showcasing a white-label social widget for streaming platforms.
            The widget on the right is what would be embedded — fully themable to match any brand.
          </div>
        </section>
      </div>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="text-sm">{label}</div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
      style={{ backgroundColor: checked ? "var(--primary)" : "#3a3a3a" }}
    >
      <span className="inline-block h-4 w-4 transform rounded-full bg-white transition" style={{ transform: `translateX(${checked ? 24 : 4}px)` }} />
    </button>
  );
}
