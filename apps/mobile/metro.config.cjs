const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
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
  'react-native-screens': path.resolve(__dirname, 'node_modules/react-native-screens'),
  'react-native-web': path.resolve(__dirname, 'node_modules/react-native-web'),
};

// Ensure we search the local node_modules first
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  rootNodeModules,
];

// Block root copies of core runtime packages so Metro stays on the mobile tree.
config.resolver.blockList = exclusionList([
  new RegExp(`${rootNodeModules}/react/.*`),
  new RegExp(`${rootNodeModules}/react-dom/.*`),
  new RegExp(`${rootNodeModules}/react-native/.*`),
  new RegExp(`${rootNodeModules}/react-native-screens/.*`),
]);

module.exports = config;
