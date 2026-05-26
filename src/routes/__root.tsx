import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import { WidgetProvider, useWidget } from "@/lib/widget-context";
import { SocialWidget } from "@/components/SocialWidget";
import { TopNav } from "@/components/TopNav";
import { useRouterState } from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <p className="mt-4 text-muted-foreground">Page not found</p>
        <Link to="/" className="mt-6 inline-flex bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium">Go home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-6 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium">Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "StreamX — Stream Together" },
      { name: "description", content: "Demo streaming platform with built-in social watch parties." },
      { name: "author", content: "StreamX" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function ChromeAndOutlet() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLogin = pathname === "/login";
  const { user } = useAuth();
  const { minimised, activePartyId } = useWidget();
  const onWatchPage = pathname.startsWith("/watch/");
  const inParty = !!activePartyId;
  // Widget is visible (taking space) only when: user logged in, not minimised,
  // and not solo-watching (widget hides itself on watch page when not in party).
  const widgetVisible = !!user && !minimised && !(onWatchPage && !inParty);
  return (
    <>
      {!isLogin && <TopNav />}
      <div className={widgetVisible ? "lg:pr-[230px] transition-[padding] duration-200" : "transition-[padding] duration-200"}>
        <Outlet />
      </div>
      <SocialWidget />
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WidgetProvider>
          <ChromeAndOutlet />
          <Toaster theme="dark" position="bottom-right" />
        </WidgetProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
