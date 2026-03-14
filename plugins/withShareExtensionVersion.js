/**
 * Config plugin that syncs the Share Extension's build version with the main app.
 *
 * expo-share-intent creates the extension target with a hardcoded
 * CURRENT_PROJECT_VERSION = "1" in the target's build settings, overriding
 * the project-level value. EAS injects the correct build number at the project
 * level, but the target override takes precedence — so the extension always
 * reports version "1" regardless of the actual build number.
 *
 * Fix: use withXcodeProject to delete the CURRENT_PROJECT_VERSION and
 * MARKETING_VERSION overrides from the extension target's build configurations,
 * so the target inherits the values EAS sets at the project level.
 */
const { withXcodeProject } = require('@expo/config-plugins');

module.exports = function withShareExtensionVersion(config) {
  return withXcodeProject(config, (modConfig) => {
    const xcodeProject = modConfig.modResults;

    const nativeTargets = xcodeProject.pbxNativeTargetSection();
    const buildConfigs = xcodeProject.pbxXCBuildConfigurationSection();
    const configLists = xcodeProject.pbxXCConfigurationListSection();

    for (const [, target] of Object.entries(nativeTargets)) {
      if (typeof target !== 'object' || !target.name) continue;
      const targetName = target.name.replace(/"/g, '');
      if (!targetName.toLowerCase().includes('shareextension')) continue;

      console.log(`[withShareExtensionVersion] Found extension target: ${targetName}`);

      const configList = configLists[target.buildConfigurationList];
      if (!configList?.buildConfigurations) continue;

      for (const configRef of configList.buildConfigurations) {
        const buildConfig = buildConfigs[configRef.value];
        if (!buildConfig?.buildSettings) continue;

        // Remove hardcoded overrides so the target inherits project-level values
        // that EAS sets correctly at build time
        delete buildConfig.buildSettings.CURRENT_PROJECT_VERSION;
        delete buildConfig.buildSettings.MARKETING_VERSION;

        console.log(
          `[withShareExtensionVersion] Cleared version overrides in ${buildConfig.name ?? configRef.value}`
        );
      }
    }

    return modConfig;
  });
};
