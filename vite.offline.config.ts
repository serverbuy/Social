/**
 * Offline-Build für die Android-App: komplette App inkl. Datenbank im Gerät, ohne Server.
 *   npx vite build -c vite.offline.config.ts
 * Ergebnis: dist-offline/  →  wird in android-app/app/src/main/assets/www kopiert.
 */
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/** Root-Route rendert im Original <html>…; im SPA-Modus brauchen wir nur den Inhalt. */
function rootShellPatch(): Plugin {
  return {
    name: "offline:root-shell",
    enforce: "pre",
    transform(code, id) {
      if (!id.replace(/\\/g, "/").endsWith("/src/routes/__root.tsx")) return null;
      let out = code
        .replace(/<html[^>]*>/, "<>")
        .replace(/<head>[\s\S]*?<\/head>/, "")
        .replace(/<body([^>]*)>/, '<div id="app-shell"$1>')
        .replace("</body>", "</div>")
        .replace("</html>", "</>")
        .replace(/<Scripts\s*\/>/, "")
        .replace(/<PreviewHostBridge\s*\/>/, "")
        .replace(/import appCss from "\.\.\/styles\.css\?url";/, 'const appCss = "";');
      return { code: out, map: null };
    },
  };
}

/** Leitet Server-only-Dateien (auch bei relativen Imports) auf Offline-Ersatz um. */
function redirectServerFiles(): Plugin {
  const map: Record<string, string> = {
    "/src/lib/db.ts": r("./offline/db.browser.ts"),
    "/src/lib/auth/middleware.ts": r("./offline/middleware-shim.ts"),
    "/src/lib/server/optional-auth.ts": r("./offline/optional-auth-shim.ts"),
    "/src/lib/auth/server.ts": r("./offline/auth-server-shim.ts"),
  };
  return {
    name: "offline:redirect-server-files",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!importer || source.startsWith("\0")) return null;
      const res = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!res) return null;
      const id = res.id.replace(/\\/g, "/").split("?")[0];
      for (const [end, target] of Object.entries(map)) {
        if (id.endsWith(end) && !importer.includes("/offline/")) return target;
      }
      return null;
    },
  };
}

/** index.html liegt nach dem Build unter offline/ – an die Wurzel verschieben. */
function moveIndex(): Plugin {
  return {
    name: "offline:move-index",
    apply: "build",
    async closeBundle() {
      const fs = await import("node:fs");
      const from = r("./dist-offline/offline/index.html");
      if (fs.existsSync(from)) {
        fs.renameSync(from, r("./dist-offline/index.html"));
        fs.rmSync(r("./dist-offline/offline"), { recursive: true, force: true });
      }
    },
  };
}

export default defineConfig({
  root: r("."),
  base: "/",
  publicDir: r("./public"),
  define: {
    "import.meta.env.VITE_AUTH_ENABLED": JSON.stringify("false"),
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  resolve: {
    tsconfigPaths: true,
    alias: [
      { find: /^@tanstack\/react-start$/, replacement: r("./offline/start-shim.ts") },
      { find: /^@tanstack\/react-start\/server$/, replacement: r("./offline/start-server-shim.ts") },
      { find: /^@\/lib\/db$/, replacement: r("./offline/db.browser.ts") },
      { find: /^@\/lib\/auth\/middleware$/, replacement: r("./offline/middleware-shim.ts") },
      { find: /^@\/lib\/server\/optional-auth$/, replacement: r("./offline/optional-auth-shim.ts") },
      { find: /^@\/lib\/auth\/server$/, replacement: r("./offline/auth-server-shim.ts") },
    ],
  },
  optimizeDeps: { exclude: ["@electric-sql/pglite"] },
  worker: { format: "es" },
  build: {
    outDir: r("./dist-offline"),
    emptyOutDir: true,
    target: "es2022",
    rollupOptions: { input: r("./offline/index.html") },
    chunkSizeWarningLimit: 5000,
  },
  plugins: [redirectServerFiles(), rootShellPatch(), tailwindcss(), viteReact(), moveIndex()],
});
