import { NextResponse } from "next/server";

export function proxy() {
  const response = NextResponse.next();
  const requestId = crypto.randomUUID();

  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      // React's development build needs eval for readable stack traces; production never does.
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://images.unsplash.com",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join("; ")
  );
  response.headers.set("X-Request-Id", requestId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
