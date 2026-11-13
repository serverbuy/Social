/** Offline-Modus: der lokale Nutzer ist immer angemeldet. */
import { createMiddleware } from "./start-shim";
export const optionalAuth = createMiddleware({ type: "function" });
