const USERNAME_RE = /^[a-z][a-z0-9_]{0,19}$/;

const RESERVED = new Set([
  "admin",
  "administrator",
  "mod",
  "moderator",
  "official",
  "known",
  "poll",
  "knownpoll",
  "social",
  "system",
  "support",
  "help",
  "root",
  "staff",
  "team",
  "hall",
  "clowns",
  "famous",
  "richest",
  "duo",
  "best",
  "null",
  "undefined",
  "everyone",
  "here",
  "me",
  "you",
  "login",
  "signup",
  "claim",
  "profile",
  "server",
  "servers",
  "forum",
  "chat",
  "friends",
  "groups",
]);

export function normalizeUsername(raw: string) {
  return raw.trim().toLowerCase().replace(/^@/, "");
}

export function validateUsername(name: string): string | null {
  if (!USERNAME_RE.test(name)) return "format";
  if (RESERVED.has(name)) return "reserved";
  return null;
}

export function usernameErrorCopy(err: string) {
  if (err === "reserved") return "Der Name ist reserviert.";
  return "1–20 Zeichen, startet mit einem Buchstaben.";
}

export function localAuthEmail(username: string) {
  return `${normalizeUsername(username)}@u.social.local`;
}
