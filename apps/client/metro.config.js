// Configuration Metro pour monorepo (Expo + pnpm/workspaces).
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Surveiller tout le monorepo (pour @laundry/shared).
config.watchFolders = [workspaceRoot];

// Résoudre les modules depuis le projet ET la racine du monorepo.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
