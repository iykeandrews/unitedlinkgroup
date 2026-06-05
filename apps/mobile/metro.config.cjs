const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
// metro-config/private/defaults/exclusionList exports an object with 'default' property
// because it's a transpiled module with __esModule: true
const exclusionListModule = require('metro-config/private/defaults/exclusionList');
const exclusionList = exclusionListModule.default || exclusionListModule;

const config = getDefaultConfig(__dirname);

// Opt out of package.json exports to avoid dual package hazard causing default undefined
config.resolver.unstable_enablePackageExports = false;
config.resolver.useWatchman = false;

// Root node_modules path
const rootNodeModules = path.resolve(__dirname, '../../node_modules');

// Force Metro to resolve 'react' and 'react-native' from the mobile app's node_modules
// This prevents "Invalid hook call" errors caused by multiple React instances
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react': path.resolve(__dirname, 'node_modules/react'),
  'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
  'react-native': path.resolve(__dirname, 'node_modules/react-native'),
};

// Ensure we search the local node_modules first
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  rootNodeModules,
];

// Block the root node_modules version of react and react-native
config.resolver.blacklistRE = exclusionList([
  new RegExp(`${rootNodeModules}/react/.*`),
  new RegExp(`${rootNodeModules}/react-native/.*`),
]);

module.exports = config;
