/**
 * Config plugin that syncs the Share Extension's CFBundleVersion and
 * CFBundleShortVersionString with the main app's values.
 *
 * expo-share-intent creates an iOS Share Extension with a hardcoded
 * CFBundleVersion of "1". Apple requires the extension version to match
 * the parent app's version, or the app may be rejected / crash on launch.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withShareExtensionVersion(config) {
  return withDangerousMod(config, [
    'ios',
    (modConfig) => {
      const iosRoot = modConfig.modRequest.platformProjectRoot;
      const appVersion = modConfig.version || '1.0.0';
      // Use $(CURRENT_PROJECT_VERSION) so EAS can inject the build number at
      // build time — same mechanism the main app target uses.
      const buildVersion = '$(CURRENT_PROJECT_VERSION)';

      // expo-share-intent names the extension target "<AppName>ShareExtension"
      // Walk the ios/ directory to find any *ShareExtension/Info.plist files.
      let found = false;
      try {
        const entries = fs.readdirSync(iosRoot, { withFileTypes: true });
        for (const entry of entries) {
          if (
            entry.isDirectory() &&
            entry.name.toLowerCase().includes('shareextension')
          ) {
            const plistPath = path.join(iosRoot, entry.name, 'Info.plist');
            if (fs.existsSync(plistPath)) {
              let content = fs.readFileSync(plistPath, 'utf8');

              // Patch CFBundleVersion
              content = content.replace(
                /<key>CFBundleVersion<\/key>\s*<string>[^<]*<\/string>/,
                `<key>CFBundleVersion</key>\n\t<string>${buildVersion}</string>`
              );

              // Patch CFBundleShortVersionString
              content = content.replace(
                /<key>CFBundleShortVersionString<\/key>\s*<string>[^<]*<\/string>/,
                `<key>CFBundleShortVersionString</key>\n\t<string>${appVersion}</string>`
              );

              fs.writeFileSync(plistPath, content);
              console.log(
                `[withShareExtensionVersion] Patched ${plistPath} → version ${appVersion} / build ${buildVersion}`
              );
              found = true;
            }
          }
        }
      } catch (e) {
        console.warn('[withShareExtensionVersion] Could not patch extension plist:', e.message);
      }

      if (!found) {
        console.warn(
          '[withShareExtensionVersion] No ShareExtension Info.plist found — skipping patch. ' +
            'This is expected on the first prebuild run; it will be applied on subsequent builds.'
        );
      }

      return modConfig;
    },
  ]);
};
