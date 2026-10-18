import type { MetadataRoute } from "next";

// The menu may be found; staff screens, the API and personal order pages are kept out of search.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/login", "/order/", "/t/"] } };
}
