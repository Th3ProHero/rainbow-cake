import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["bcrypt"],
  
  // Optimize images (Requirement 3.4)
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [320, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
    // Optimize package imports (Requirement 3.5)
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },

  // Production optimizations
  productionBrowserSourceMaps: false,
  
  // Remove console.log in production (Requirement 3.8)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Headers for performance - cache static resources (Requirement 3.4)
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|webp|avif)',
        locale: false,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Turbopack configuration (Next.js 16+)
  turbopack: {
    // Empty config to silence the warning about webpack config
  },

  // Webpack customization for bundle analysis (legacy - only used with --webpack flag)
  webpack: (config, { isServer }) => {
    // Analyze bundle in production
    if (!isServer && process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: './analyze.html',
        })
      );
    }

    return config;
  },
};

export default nextConfig;
