import { useRouterState } from "@tanstack/react-router";
import { useWidget } from "@/lib/widget-context";
import { useAuth } from "@/lib/auth";
import { useWidgetBranding } from "@/lib/widget-branding-context";
import { MainPanel } from "./widget/MainPanel";
import { ChatPanel } from "./widget/ChatPanel";
import { PartyPanel } from "./widget/PartyPanel";
import { ChevronRight, ChevronLeft, Minimize2 } from "lucide-react";

export function SocialWidget() {
  const { user } = useAuth();
  const { view, minimised, setMinimised, activePartyId } = useWidget();
  const branding = useWidgetBranding();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!user) return null;

  const onWatchPage = pathname.startsWith("/watch/");
  const inParty = !!activePartyId;
  // Hide widget when watching alone (not in a party)
  if (onWatchPage && !inParty) return null;

  // When in party, force party view
  const effectiveView = inParty && view.kind !== "party" ? { kind: "party" as const, partyId: activePartyId! } : view;

  if (minimised) {
    return (
      <button
        onClick={() => setMinimised(false)}
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-50 ${inParty ? "bg-primary text-primary-foreground" : "bg-card border border-r-0 border-border text-foreground"} rounded-l-md p-2 shadow-lg hover:opacity-90`}
        title="Open social widget"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
    );
  }

  return (
    <aside className="fixed right-0 top-0 bottom-0 w-[230px] bg-widget border-l border-border z-40 flex flex-col shadow-2xl">
      <header className="p-3 border-b border-border flex items-center justify-between bg-background/40">
        <div className="flex items-center gap-1.5 min-w-0">
          {branding.logo.kind === "image" ? (
            <img
              src={branding.logo.src}
              alt={branding.logo.alt ?? `${branding.name} logo`}
              className="w-5 h-5 rounded object-contain shrink-0"
            />
          ) : (
            <div
              className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
              style={{
                background: branding.logo.background ?? "var(--primary)",
                color: branding.logo.color ?? "var(--primary-foreground)",
              }}
            >
              {branding.logo.text}
            </div>
          )}
          <div className="text-xs font-semibold truncate">
            {branding.name}
            {branding.tagline ? ` ${branding.tagline}` : ""}
          </div>
        </div>
        <button onClick={() => setMinimised(true)} className="p-1 hover:bg-accent rounded shrink-0" title="Minimise">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </header>
      <div className="flex-1 min-h-0 relative">
        {effectiveView.kind === "main" && <MainPanel />}
        {effectiveView.kind === "chat" && <ChatPanel friendId={effectiveView.friendId} />}
        {effectiveView.kind === "party" && <PartyPanel partyId={effectiveView.partyId} />}
      </div>
    </aside>
  );
}
