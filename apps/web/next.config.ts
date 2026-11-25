import type { NextConfig } from "next";

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
