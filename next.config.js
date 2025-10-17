/** @type {import('next').NextConfig} */
const path = require('path');
const fs = require('fs');

// ────────────────────────────────────────────────────────────────────────────────
// Upgrade Guard (non-strict): warn when patch policy mismatch
// Checks that patches/@ai-sdk-tools+agents+<version>.patch exists for installed version
// ────────────────────────────────────────────────────────────────────────────────
try {
  const pkg = require('./package.json');
  const dep = (pkg.dependencies && pkg.dependencies['@ai-sdk-tools/agents']) ||
              (pkg.devDependencies && pkg.devDependencies['@ai-sdk-tools/agents']) || '';
  const cleaned = String(dep).trim().replace(/^\^|~/, '');
  if (cleaned) {
    const patchName = `@ai-sdk-tools+agents+${cleaned}.patch`;
    const patchPath = path.resolve(__dirname, 'patches', patchName);
    if (!fs.existsSync(patchPath)) {
      // eslint-disable-next-line no-console
      console.warn(`Upgrade Guard: missing patch file ${patchName}. Ensure dependency version matches patch-package file to avoid regressions.`);
    }
  }
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('Upgrade Guard: unable to verify patch policy', e?.message || e);
}

const nextConfig = {
  experimental: {
    // Enable React Server Components
    serverComponentsExternalPackages: ['@ai-sdk/openai', '@openrouter/ai-sdk-provider'],
    // Optimize for streaming responses
    serverActions: {
      allowedForwardedHosts: ['localhost'],
      allowedOrigins: ['http://localhost:3000'],
    },
  },
  // Optimize for AI SDK streaming
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Handle ES modules properly for AI SDK
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Optimize cache serialization to fix webpack large strings warning
    if (dev) {
      config.cache = {
        ...config.cache,
        compression: 'gzip', // Compress cache files
        maxMemoryGenerations: 1, // Limit memory generations
        cacheDirectory: path.resolve(__dirname, '.next/cache/webpack'), // Custom cache directory (absolute path)
      };
    }

    // Client-side polyfills and fallbacks
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        // Temporarily disable crypto polyfill to fix build
        // crypto: require.resolve('crypto-browserify'),
        crypto: false,
        buffer: require.resolve('buffer'),
        stream: require.resolve('stream-browserify'),
        util: require.resolve('util'),
      };

      // Provide Buffer polyfill for client-side
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      );
    } else {
      // Server-side: ensure crypto is available
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: 'crypto', // Use native Node.js crypto on server
      };
    }

    return config;
  },
  // Enable gzip compression for streaming
  compress: true,
  // Optimize for real-time responses
  poweredByHeader: false,
  // Headers for SSE streaming
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/api/ai/stream/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/event-stream',
          },
          {
            key: 'Connection',
            value: 'keep-alive',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
