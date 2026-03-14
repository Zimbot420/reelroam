/**
 * Config plugin that syncs the Share Extension's build version with the main app.
 *
 * expo-share-intent adds the extension target via a finalization step that runs
 * after ALL config plugin mods (including withDangerousMod), so there is no
 * way to patch it during prebuild. The only reliable hook that runs after the
 * extension target exists is the Podfile post_install step.
 *
 * This plugin injects a Ruby snippet into the Podfile post_install that uses
 * the xcodeproj gem (bundled with CocoaPods) to open the .xcodeproj, find the
 * ShareExtension target, and delete the hardcoded CURRENT_PROJECT_VERSION and
 * MARKETING_VERSION build setting overrides. Removing the overrides lets the
 * target inherit the project-level values that EAS injects at build time.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '[withShareExtensionVersion]';

const HOOK = `
  # Sync ShareExtension version with parent app ${MARKER}
  require 'xcodeproj'
  project_path = Dir.glob(File.join(installer.sandbox.root.to_s, '..', '*.xcodeproj')).first
  if project_path
    project = Xcodeproj::Project.open(project_path)
    project.targets.each do |target|
      next unless target.name.downcase.include?('shareextension')
      puts "[withShareExtensionVersion] Found target: #{target.name}"
      target.build_configurations.each do |config|
        config.build_settings.delete('CURRENT_PROJECT_VERSION')
        config.build_settings.delete('MARKETING_VERSION')
        puts "[withShareExtensionVersion] Cleared version overrides in #{config.name}"
      end
    end
    project.save
    puts "[withShareExtensionVersion] Saved project"
  else
    puts "[withShareExtensionVersion] WARNING: No .xcodeproj found"
  end
`;

module.exports = function withShareExtensionVersion(config) {
  return withDangerousMod(config, [
    'ios',
    (modConfig) => {
      const podfilePath = path.join(modConfig.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      if (podfile.includes(MARKER)) {
        return modConfig;
      }

      if (podfile.includes('post_install do |installer|')) {
        podfile = podfile.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|\n${HOOK}`
        );
      } else {
        podfile += `\npost_install do |installer|\n${HOOK}\nend\n`;
      }

      fs.writeFileSync(podfilePath, podfile);
      console.log('[withShareExtensionVersion] Injected post_install hook into Podfile');
      return modConfig;
    },
  ]);
};
