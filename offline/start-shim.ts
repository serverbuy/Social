/**
 * Offline-Modus: Ersetzt `@tanstack/react-start` im Handy-Build.
 * Server-Funktionen laufen direkt im Gerät (gegen die eingebaute PGlite-Datenbank),
 * statt per Netzwerk an einen Server zu gehen.
 */
export const OFFLINE_USER_ID = "dev-user";

type Validator = ((x: unknown) => unknown) | { parse: (x: unknown) => unknown } | undefined;

function runValidator(v: Validator, data: unknown) {
  if (!v) return data;
  if (typeof v === "function") return v(data);
  if (typeof (v as { parse?: unknown }).parse === "function") return (v as { parse: (x: unknown) => unknown }).parse(data);
  return data;
}

export function createServerFn(_opts?: unknown) {
  let validator: Validator;
  const builder = {
    middleware(_m: unknown) { return builder; },
    validator(v: Validator) { validator = v; return builder; },
    inputValidator(v: Validator) { validator = v; return builder; },
    handler<T>(h: (ctx: { data: any; context: { userId: string } }) => T) {
      const fn = async (arg?: { data?: unknown }) => {
        const data = runValidator(validator, arg?.data);
        return await h({ data, context: { userId: OFFLINE_USER_ID } });
      };
      return fn as unknown as (arg?: { data?: any }) => Promise<Awaited<T>>;
    },
  };
  return builder;
}

export function createMiddleware(_opts?: unknown) {
  const mw: any = {
    client() { return mw; },
    server() { return mw; },
    middleware() { return mw; },
    inputValidator() { return mw; },
    validator() { return mw; },
  };
  return mw;
}

export function useServerFn<T>(fn: T): T { return fn; }
