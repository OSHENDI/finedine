import type { MetadataRoute } from "next";

// Lets a phone offer "Add to home screen" and open the menu full screen, without a browser bar.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FineDine",
    short_name: "FineDine",
    description: "Order from your table: scan, choose, pay and follow your order.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7ea",
    theme_color: "#faf7ea",
    icons: [{ src: "/icon.png", sizes: "192x192", type: "image/png" }]
  };
}
