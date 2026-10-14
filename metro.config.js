// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 1. Let Metro recognize .wasm files as assets (NOT sourceExts, which breaks Babel)
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

// 2. Ensure package exports are enabled so conditional exports resolve correctly
config.resolver.unstable_enablePackageExports = true;

// 3. Add COEP and COOP headers to support SharedArrayBuffer (required for SQLite WASM)
const originalEnhanceMiddleware = config.server?.enhanceMiddleware;
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    const nextMiddleware = originalEnhanceMiddleware
      ? originalEnhanceMiddleware(middleware, server)
      : middleware;
    return (req, res, next) => {
      res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      return nextMiddleware(req, res, next);
    };
  },
};

module.exports = config;
