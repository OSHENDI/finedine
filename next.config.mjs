const nextConfig = {
  poweredByHeader: false,
  // No floating "compiling" badge in the corner while developing.
  devIndicators: false,
  // Keep the dev compiler's work on disk, so restarting the dev server does not recompile everything.
  // inlineCss puts the page's CSS in the HTML, so it never blocks the first paint on a second request.
  experimental: { turbopackFileSystemCacheForDev: true, inlineCss: true },
  compress: true,
  output: process.env.DOCKER_BUILD === "true" ? "standalone" : undefined,
  serverExternalPackages: ["@electric-sql/pglite"],
  turbopack: {
    root: process.cwd()
  },
  images: {
    // Phone-sized steps only: the menu never shows a photo wider than the phone column.
    deviceSizes: [360, 480, 640, 828],
    imageSizes: [76, 144, 240, 320],
    minimumCacheTTL: 2592000,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      }
    ]
  },
  async headers() {
    // Brand files never change under the same name in a release: let browsers and CDNs keep them.
    const longCache = [{ key: "Cache-Control", value: "public, max-age=31536000, stale-while-revalidate=86400" }];
    return [
      { source: "/intro.mp4", headers: longCache },
      { source: "/intro-poster.jpg", headers: longCache },
      { source: "/logo.png", headers: longCache },
      // Customer pages: always revalidated, but allowed into the back/forward cache (no "no-store").
      ...["/", "/m/:slug", "/t/:token"].map((source) => ({ source, headers: [{ key: "Cache-Control", value: "private, no-cache" }] })),
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
