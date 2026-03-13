/**
 * Config plugin that sets SWIFT_STRICT_CONCURRENCY = minimal on all pod targets.
 * This fixes build errors like "static property 'center' is not concurrency-safe
 * because non-'Sendable' type 'ContentPosition' may have shared mutable state"
 * which come from native dependencies (e.g. react-native-maps) under Xcode 16.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const HOOK = `
  # Fix Swift strict concurrency errors in pods (Xcode 16)
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
    end
  end
`;

module.exports = function withPodsSwiftConcurrencyFix(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      // Only inject if not already present
      if (podfile.includes('SWIFT_STRICT_CONCURRENCY')) {
        return config;
      }

      // Append before the last `end` of any existing post_install block,
      // or add a new post_install block before the final line.
      if (podfile.includes('post_install do |installer|')) {
        // Insert our hook right after the post_install opening line
        podfile = podfile.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|\n${HOOK}`
        );
      } else {
        // No post_install block — add one at the end
        podfile += `\npost_install do |installer|\n${HOOK}\nend\n`;
      }

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
};
