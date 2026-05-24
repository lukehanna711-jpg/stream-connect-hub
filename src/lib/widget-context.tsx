import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";

type WidgetView =
  | { kind: "main" }
  | { kind: "chat"; friendId: string }
  | { kind: "party"; partyId: string };

interface WidgetCtx {
  view: WidgetView;
  setView: (v: WidgetView) => void;
  minimised: boolean;
  setMinimised: (b: boolean) => void;
  onlineIds: Set<string>;
  activePartyId: string | null;
  setActivePartyId: (id: string | null) => void;
}

const Ctx = createContext<WidgetCtx>({
  view: { kind: "main" },
  setView: () => {},
  minimised: false,
  setMinimised: () => {},
  onlineIds: new Set(),
  activePartyId: null,
  setActivePartyId: () => {},
});

export function WidgetProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [view, setView] = useState<WidgetView>({ kind: "main" });
  const [minimised, setMinimised] = useState(false);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [activePartyId, setActivePartyId] = useState<string | null>(null);

  // Presence: track online users
  useEffect(() => {
    if (!user) {
      setOnlineIds(new Set());
      return;
    }
    const channel = supabase.channel("online-users", {
      config: { presence: { key: user.id } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnlineIds(new Set(Object.keys(state)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });
    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  return (
    <Ctx.Provider value={{ view, setView, minimised, setMinimised, onlineIds, activePartyId, setActivePartyId }}>
      {children}
    </Ctx.Provider>
  );
}

export const useWidget = () => useContext(Ctx);
