import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { APP_DESCRIPTION, APP_NAME, APP_ORIGIN, APP_SOCIAL_IMAGE, APP_TITLE } from "../lib/brand";
import { analyticsHeadScripts, analyticsNoscriptImage } from "../lib/analytics";
import { DEFAULT_NAV_STYLE } from "../lib/nav-style";
import { Toaster } from "../components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1",
      },
      { title: APP_TITLE },
      { name: "description", content: APP_DESCRIPTION },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      // The chrome around the embedded site is solid black on every theme
      // (see --app-chrome-bg at :root), so the browser's own bar has to be
      // black too -- the near-white value that used to sit here drew a pale
      // strip above a black app on every phone.
      { name: "apple-mobile-web-app-status-bar-style", content: "black" },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      { name: "theme-color", content: "#000000" },

      { property: "og:site_name", content: APP_NAME },
      { property: "og:title", content: APP_TITLE },
      { property: "og:description", content: APP_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: APP_ORIGIN },
      // A card without an image is the failure this block exists to prevent:
      // twitter:card already promised a large image, and every share rendered
      // as a bare link because nothing supplied one. Absolute URLs only --
      // crawlers do not resolve relative paths.
      { property: "og:image", content: APP_SOCIAL_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: `${APP_NAME} — ${APP_DESCRIPTION}` },

      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: APP_TITLE },
      { name: "twitter:description", content: APP_DESCRIPTION },
      { name: "twitter:image", content: APP_SOCIAL_IMAGE },
      { name: "twitter:image:alt", content: `${APP_NAME} — ${APP_DESCRIPTION}` },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      // Three icon declarations, because no single format covers everything:
      // the .ico carries 16/32/48 for browser tabs and legacy bookmarks, the
      // SVG is what modern browsers prefer and stays sharp at any size, and
      // iOS reads only apple-touch-icon when a page is added to the home
      // screen. Android and installable-PWA icons come from the manifest.
      { rel: "icon", href: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "canonical", href: APP_ORIGIN },
    ],
    // Declared here because this is the app's only global head: every route
    // gets it without opting in, and the router keeps ownership of the tag
    // across client navigations instead of appending a copy on each one.
    // Empty off production -- see src/lib/analytics.ts.
    scripts: analyticsHeadScripts(),
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  // The analytics fallback pixel. In the body, not beside the script in the
  // head: a <noscript> in <head> may only hold link, style and meta, so an
  // <img> there is invalid and browsers hoist it into the body regardless.
  // This is the app's only shell, so it renders once per document.
  const noscriptImage = analyticsNoscriptImage();

  return (
    <html lang="en" data-app-nav={DEFAULT_NAV_STYLE}>
      <head>
        <HeadContent />
      </head>
      <body>
        {noscriptImage ? (
          <noscript>
            <img src={noscriptImage.src} alt="" referrerPolicy="no-referrer-when-downgrade" />
          </noscript>
        ) : null}
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
