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
    // Temporarily exclude Sentry native code to isolate a
    // dispatch_once crash (nil object in NSDictionary during
    // native module init). JS Sentry calls become no-ops.
    '@sentry/react-native': {
      platforms: {
        ios: null,
        android: null,
      },
    },
  },
};
