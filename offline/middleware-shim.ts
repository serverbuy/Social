/** Offline-Modus: Es gibt nur einen lokalen Nutzer, daher keine Prüfung nötig. */
import { createMiddleware } from "./start-shim";
export const authMiddleware = createMiddleware({ type: "function" });
