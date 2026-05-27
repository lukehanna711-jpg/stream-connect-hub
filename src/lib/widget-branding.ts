// White-label widget branding.
// Swap these values (or the whole object) per streaming company / deployment.
// In a multi-tenant setup, load this from env vars, a tenant config API,
// or a per-domain lookup and pass it through WidgetBrandingProvider.

export interface WidgetBranding {
  /** Company / platform name shown next to the logo in the widget header. */
  name: string;
  /**
   * Logo for the widget header. Either:
   *  - `text`: a short string/emoji rendered inside a coloured tile (good for demos), or
   *  - `src`: an image URL (svg/png) rendered as <img>.
   */
  logo:
    | { kind: "text"; text: string; background?: string; color?: string }
    | { kind: "image"; src: string; alt?: string };
  /** Optional suffix shown after the name, e.g. "Social". Set to "" to hide. */
  tagline?: string;
}

export const defaultBranding: WidgetBranding = {
  name: "StreamX",
  tagline: "Social",
  logo: {
    kind: "text",
    text: "▶",
    background: "var(--primary)",
    color: "var(--primary-foreground)",
  },
};
