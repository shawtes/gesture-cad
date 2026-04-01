import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["three"],
  webpack: (config, { isServer }) => {
    // Handle WASM files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Exclude planegcs WASM loader from server bundle — it's client-only
    if (isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push("@salusoft89/planegcs");
      }
    }

    // Fix for planegcs relative import issue
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...(config.resolve?.fallback || {}),
        fs: false,
        path: false,
      },
    };

    return config;
  },
};

export default nextConfig;
