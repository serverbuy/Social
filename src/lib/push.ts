const KEY = "social-push";

export function pushWanted() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function pushEnabled() {
  return typeof Notification !== "undefined" && Notification.permission === "granted" && pushWanted();
}

export async function enablePush() {
  if (typeof Notification === "undefined") return false;
  const p = await Notification.requestPermission();
  if (p !== "granted") return false;
  localStorage.setItem(KEY, "1");
  return true;
}

export function disablePush() {
  localStorage.setItem(KEY, "0");
}

export function notifyPush(title: string, body: string) {
  if (!pushEnabled()) return;
  try {
    new Notification(title, { body, icon: "/__grok/icon-180.png" });
  } catch {
    /* ignore */
  }
}
