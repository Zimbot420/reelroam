module.exports = {
  dependencies: {
    // Exclude react-native-worklets from native autolinking.
    // We only need its babel plugin (JS); reanimated 3.x bundles
    // its own worklets native module, so linking both causes
    // duplicate symbol errors at link time.
    'react-native-worklets': {
      platforms: {
        ios: null,
        android: null,
      },
    },
    // Temporarily exclude reanimated native code to isolate a
    // dispatch_once crash (nil object in NSDictionary during
    // native module init). Reanimated 3.19.x may be incompatible
    // with RN 0.81.5 — its constantsToExport likely returns nil.
    'react-native-reanimated': {
      platforms: {
        ios: null,
        android: null,
      },
    },
  },
};
