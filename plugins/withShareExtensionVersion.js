/**
 * Config plugin that syncs the Share Extension's build version with the main app.
 *
 * expo-share-intent creates the extension target with a hardcoded
 * CURRENT_PROJECT_VERSION = "1" in the target's build settings, overriding
 * the project-level value. EAS injects the correct build number at the project
 * level, but the target override takes precedence — so the extension always
 * reports version "1" regardless of the actual build number.
 *
 * Fix: delete the CURRENT_PROJECT_VERSION and MARKETING_VERSION overrides from
 * the extension target's build configurations so the target inherits the values
 * EAS sets at the project level.
 */
const { withXcodeProject } = require('@expo/config-plugins');

module.exports = function withShareExtensionVersion(config) {
  return withXcodeProject(config, (modConfig) => {
    const xcodeProject = modConfig.modResults;

    const nativeTargets = xcodeProject.pbxNativeTargetSection();
    const buildConfigs = xcodeProject.pbxXCBuildConfigurationSection();
    // Access config lists directly from the raw project objects
    const configLists = xcodeProject.hash.project.objects['XCConfigurationList'] || {};

    for (const [, target] of Object.entries(nativeTargets)) {
      if (typeof target !== 'object' || !target.name) continue;
      const targetName = target.name.replace(/"/g, '');
      if (!targetName.toLowerCase().includes('shareextension')) continue;

      console.log(`[withShareExtensionVersion] Found extension target: ${targetName}`);

      const configListKey = target.buildConfigurationList;
      const configList = configLists[configListKey] || configLists[configListKey?.replace(/"/g, '')];
      if (!configList?.buildConfigurations) continue;

      for (const configRef of configList.buildConfigurations) {
        const key = typeof configRef === 'object' ? configRef.value : configRef;
        const buildConfig = buildConfigs[key];
        if (!buildConfig?.buildSettings) continue;

        delete buildConfig.buildSettings.CURRENT_PROJECT_VERSION;
        delete buildConfig.buildSettings.MARKETING_VERSION;

        console.log(
          `[withShareExtensionVersion] Cleared version overrides in ${buildConfig.name ?? key}`
        );
      }
    }

    return modConfig;
  });
};
