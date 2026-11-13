/** Offline-Modus: kein Login-Server im Handy. */
export const auth = {
  handler: async (_req: Request) => new Response("offline", { status: 404 }),
  api: {},
};
