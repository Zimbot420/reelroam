/**
 * Config plugin that syncs the Share Extension's CFBundleVersion and
 * CFBundleShortVersionString with the main app by injecting a Ruby snippet
 * into the Podfile's post_install hook.
 *
 * Why Podfile instead of withDangerousMod:
 *   expo-share-intent creates the extension files *after* all withDangerousMod
 *   hooks have run, so a direct file patch always fires too early and finds
 *   nothing. The Podfile post_install hook runs during `pod install`, which
 *   happens after prebuild — by that point the extension's Info.plist exists.
 *
 * The plist values are set to Xcode build variables ($(CURRENT_PROJECT_VERSION)
 * and $(MARKETING_VERSION)) so they resolve correctly at Xcode build time
 * regardless of how the build number was set (auto-increment or manual).
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '[withShareExtensionVersion]';

const HOOK = `
  # Sync ShareExtension version with parent app ${MARKER}
  ios_root = File.expand_path('..', installer.sandbox.root.to_s)
  puts "[withShareExtensionVersion] Searching in #{ios_root}"
  Dir.glob(File.join(ios_root, '**', 'Info.plist')).reject { |p| p.include?('/Pods/') || p.include?('/build/') }.each do |plist_path|
    puts "[withShareExtensionVersion] Found plist: #{plist_path}"
    next unless plist_path.downcase.include?('shareextension') || plist_path.downcase.include?('share_extension')
    system('/usr/libexec/PlistBuddy', '-c', 'Set :CFBundleVersion $(CURRENT_PROJECT_VERSION)', plist_path)
    system('/usr/libexec/PlistBuddy', '-c', 'Set :CFBundleShortVersionString $(MARKETING_VERSION)', plist_path)
    puts "[withShareExtensionVersion] Patched #{plist_path}"
  end
`;

module.exports = function withShareExtensionVersion(config) {
  return withDangerousMod(config, [
    'ios',
    (modConfig) => {
      const podfilePath = path.join(modConfig.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      // Already injected — skip
      if (podfile.includes(MARKER)) {
        return modConfig;
      }

      if (podfile.includes('post_install do |installer|')) {
        // Insert into existing post_install block
        podfile = podfile.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|\n${HOOK}`
        );
      } else {
        // No post_install block yet — create one
        podfile += `\npost_install do |installer|\n${HOOK}\nend\n`;
      }

      fs.writeFileSync(podfilePath, podfile);
      console.log('[withShareExtensionVersion] Injected post_install hook into Podfile');
      return modConfig;
    },
  ]);
};
