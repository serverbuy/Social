import "../src/styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "../src/router";
import { ensureDbReady } from "./db.browser";

// Theme/Sprache wie im Original vor dem ersten Rendern setzen
try {
  const t = localStorage.getItem("social-theme");
  if (t) document.documentElement.setAttribute("data-theme", t);
  const l = localStorage.getItem("social-lang");
  if (l) document.documentElement.lang = l;
} catch { /* egal */ }

const router = getRouter();
const rootEl = document.getElementById("root")!;

ensureDbReady()
  .catch((e) => {
    console.error("[offline] DB-Start fehlgeschlagen", e);
    const d = document.getElementById("bootErr");
    if (d) d.textContent += `Datenbank: ${(e as Error)?.message ?? e}\n`;
  })
  .finally(() => {
    document.getElementById("boot")?.remove();
    createRoot(rootEl).render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    );
  });
