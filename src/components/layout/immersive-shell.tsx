import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useMe } from "./me-context";

export function ImmersiveShell({ children }: { children: ReactNode }) {
  const { ready, signedIn, profile } = useMe();
  if (!ready) {
    return <div className="grid min-h-dvh place-items-center bg-bg text-sm text-muted">…</div>;
  }
  if (!signedIn) return <Navigate to="/login" replace />;
  if (!profile) return <Navigate to="/claim" replace />;
  return <div className="fixed inset-0 z-50 flex min-h-0 flex-col overflow-hidden bg-bg text-fg">{children}</div>;
}
