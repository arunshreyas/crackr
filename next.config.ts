import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_CLERK_JS_URL:
      process.env.NEXT_PUBLIC_CLERK_JS_URL ||
      "https://cdn.jsdelivr.net/npm/@clerk/clerk-js@6/dist/clerk.browser.js",
    NEXT_PUBLIC_CLERK_UI_URL:
      process.env.NEXT_PUBLIC_CLERK_UI_URL ||
      "https://cdn.jsdelivr.net/npm/@clerk/ui@1/dist/ui.browser.js",
  },
};

export default nextConfig;
