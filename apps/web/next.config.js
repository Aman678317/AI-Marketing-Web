/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  webpack: (config) => {
    // bullmq optionally loads @valkey/valkey-glide and ioredis-mock; webpack
    // traces those imports and warns "Module not found" even though they are
    // never used at runtime. Alias them to false to silence the noise.
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      '@valkey/valkey-glide': false,
      'ioredis-mock': false,
    };
    return config;
  },
};
module.exports = nextConfig;
