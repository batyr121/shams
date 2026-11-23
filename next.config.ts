import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  images: { unoptimized: true },
  poweredByHeader: false,
  devIndicators: false,
  allowedDevOrigins:
    process.env.NODE_ENV === "development" && process.env.LOCAL_NETWORK_ORIGIN
      ? [new URL(process.env.LOCAL_NETWORK_ORIGIN).hostname]
      : [],
  serverExternalPackages: ["pg"],
  webpack(config, { dev }) {
    if (dev) {
      const ignored = config.watchOptions?.ignored;
      const own = /[\\/]\.data[\\/]/;
      config.watchOptions = {
        ...config.watchOptions,
        ignored:
          ignored instanceof RegExp
            ? new RegExp(ignored.source + "|" + own.source)
            : [
                ...(Array.isArray(ignored)
                  ? ignored
                  : typeof ignored === "string"
                    ? [ignored]
                    : []),
                "**/.data/**",
              ],
      };
    }
    return config;
  },
};
export default config;
