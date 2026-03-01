const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Allow bundling WebAssembly files used by expo-sqlite on web
if (!config.resolver.assetExts.includes("wasm")) {
  config.resolver.assetExts.push("wasm");
}

// Ensure pre-bundled SQLite files are included in app assets
if (!config.resolver.assetExts.includes("db")) {
  config.resolver.assetExts.push("db");
}

// Needed for SharedArrayBuffer (expo-sqlite web worker)
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    return middleware(req, res, next);
  };
};

module.exports = config;
