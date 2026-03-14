/**
 * Config plugin that syncs the Share Extension's build version with the main app.
 *
 * expo-share-intent adds the extension target via withDangerousMod, which runs
 * after all withXcodeProject mods. So we also use withDangerousMod (registered
 * after expo-share-intent) and directly read/modify the .pbxproj file on disk
 * to remove the hardcoded CURRENT_PROJECT_VERSION = "1" override from the
 * extension target, letting it inherit the project-level value EAS injects.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

module.exports = function withShareExtensionVersion(config) {
  return withDangerousMod(config, [
    'ios',
    (modConfig) => {
      const projectRoot = modConfig.modRequest.platformProjectRoot;
      const projectName = modConfig.modRequest.projectName;
      const pbxprojPath = path.join(
        projectRoot,
        `${projectName}.xcodeproj`,
        'project.pbxproj'
      );

      if (!fs.existsSync(pbxprojPath)) {
        console.warn('[withShareExtensionVersion] project.pbxproj not found — skipping');
        return modConfig;
      }

      // Use the xcode package (bundled with Expo) to parse and modify the project
      const xcode = require('xcode');
      const xcodeProject = xcode.project(pbxprojPath);
      xcodeProject.parseSync();

      console.log('[withShareExtensionVersion] Scanning Xcode targets...');

      const nativeTargets = xcodeProject.pbxNativeTargetSection();
      const buildConfigs = xcodeProject.pbxXCBuildConfigurationSection();
      const configLists =
        xcodeProject.hash.project.objects['XCConfigurationList'] || {};

      let patched = false;

      for (const [, target] of Object.entries(nativeTargets)) {
        if (typeof target !== 'object' || !target.name) continue;
        const targetName = target.name.replace(/"/g, '');

        // Log every target so we can see what names exist
        console.log(`[withShareExtensionVersion] Target: ${targetName}`);

        if (!targetName.toLowerCase().includes('shareextension')) continue;

        console.log(`[withShareExtensionVersion] Found extension target: ${targetName}`);

        const configListKey = target.buildConfigurationList;
        const configList =
          configLists[configListKey] ||
          configLists[configListKey?.replace(/"/g, '')];

        if (!configList?.buildConfigurations) continue;

        for (const configRef of configList.buildConfigurations) {
          const key = typeof configRef === 'object' ? configRef.value : configRef;
          const buildConfig = buildConfigs[key];
          if (!buildConfig?.buildSettings) continue;

          delete buildConfig.buildSettings.CURRENT_PROJECT_VERSION;
          delete buildConfig.buildSettings.MARKETING_VERSION;
          patched = true;

          console.log(
            `[withShareExtensionVersion] Cleared version overrides in ${buildConfig.name ?? key}`
          );
        }
      }

      if (patched) {
        fs.writeFileSync(pbxprojPath, xcodeProject.writeSync());
        console.log('[withShareExtensionVersion] Saved project.pbxproj');
      } else {
        console.warn(
          '[withShareExtensionVersion] No ShareExtension target found — nothing patched'
        );
      }

      return modConfig;
    },
  ]);
};
