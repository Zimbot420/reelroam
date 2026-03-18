module.exports = {
  dependencies: {
    // Exclude react-native-worklets from native autolinking.
    // Reanimated 4.x bundles its own worklets native module,
    // so linking both causes duplicate symbol errors.
    'react-native-worklets': {
      platforms: {
        ios: null,
        android: null,
      },
    },
  },
};
