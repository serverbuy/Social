import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { MeProvider } from "@/components/layout/me-context";
import { I18nProvider } from "@/components/layout/i18n-context";
import { ThemeProvider } from "@/components/layout/theme-context";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";

const APP_NAME = "@social";
const THEME_BOOT = `(function(){try{var t=localStorage.getItem("social-theme");if(t)document.documentElement.setAttribute("data-theme",t);var l=localStorage.getItem("social-lang");if(l)document.documentElement.lang=l;}catch(e){}})();`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "theme-color", content: "#313338" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: Root,
});

function Root() {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="bg-bg text-fg">
        <PreviewHostBridge />
        <AuthProvider>
          <ThemeProvider>
            <I18nProvider>
              <MeProvider>
                <Outlet />
                <Toaster
                  theme="dark"
                  position="bottom-right"
                  toastOptions={{
                    style: {
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-line-strong)",
                      color: "var(--color-fg)",
                      borderRadius: 12,
                    },
                  }}
                />
              </MeProvider>
            </I18nProvider>
          </ThemeProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
