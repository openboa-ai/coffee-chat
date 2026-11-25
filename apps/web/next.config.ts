import type { NextConfig } from "next";

const PRIVATE_NO_STORE = [
  {
    key: "Cache-Control",
    value: "private, no-store",
  },
];

const nextConfig: NextConfig = {
  transpilePackages: [
    "@coffee-chat/core",
    "@coffee-chat/ui",
    "@coffee-chat/mcp-apps",
    "@openboa/yogurt",
    "@ui-sdk/core",
    "@ui-sdk/react",
  ],
  serverExternalPackages: ["@electric-sql/pglite"],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
  async headers() {
    return [
      { source: "/", headers: PRIVATE_NO_STORE },
      { source: "/me", headers: PRIVATE_NO_STORE },
      { source: "/sources", headers: PRIVATE_NO_STORE },
      { source: "/sources/:id", headers: PRIVATE_NO_STORE },
      { source: "/u/:handle", headers: PRIVATE_NO_STORE },
      { source: "/@:handle", headers: PRIVATE_NO_STORE },
      { source: "/connect", headers: PRIVATE_NO_STORE },
      { source: "/signin", headers: PRIVATE_NO_STORE },
      { source: "/oauth/consent", headers: PRIVATE_NO_STORE },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/@:handle",
        destination: "/u/:handle",
      },
    ];
  },
};

export default nextConfig;
