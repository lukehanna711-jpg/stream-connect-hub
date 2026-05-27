import { createContext, useContext, type ReactNode } from "react";
import { defaultBranding, type WidgetBranding } from "./widget-branding";

const Ctx = createContext<WidgetBranding>(defaultBranding);

export function WidgetBrandingProvider({
  branding,
  children,
}: {
  branding?: WidgetBranding;
  children: ReactNode;
}) {
  return <Ctx.Provider value={branding ?? defaultBranding}>{children}</Ctx.Provider>;
}

export const useWidgetBranding = () => useContext(Ctx);
