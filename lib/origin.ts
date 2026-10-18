// The address customers use to reach the app, for links that must work outside this server
// (the QR codes). In order: APP_URL, the URL the host announces (Render sets RENDER_EXTERNAL_URL), then
// what the reverse proxy forwarded, then the request itself. NEXT_PUBLIC_* values are deliberately not
// used: Next.js freezes them into the build, and a build made on a developer machine would keep localhost.
// Behind a proxy the request's own address is an internal one, so it comes last.
export function publicOrigin(request: Request) {
  const configured = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL;
  if (configured) return configured.replace(/\/+$/, "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto.split(",")[0].trim()}://${host.split(",")[0].trim()}`;
  return new URL(request.url).origin;
}
