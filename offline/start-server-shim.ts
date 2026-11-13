/** Offline-Modus: Platzhalter für `@tanstack/react-start/server`. */
export function getRequest(): Request {
  return new Request(typeof location !== "undefined" ? location.href : "https://social.local/");
}
export const getWebRequest = getRequest;
export function getCookie(_name: string): string | undefined { return undefined; }
export function setCookie() {}
export function setResponseHeader() {}
export function getRequestHeader(): string | undefined { return undefined; }
