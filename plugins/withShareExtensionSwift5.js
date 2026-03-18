/**
 * Config plugin that forces SWIFT_VERSION = 5 on the ShareExtension target.
 * This prevents Swift 6 strict concurrency errors from expo-share-intent.
 */
const { withXcodeProject } = require('@expo/config-plugins');

module.exports = function withShareExtensionSwift5(config) {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const targets = xcodeProject.pbxNativeTargetSection();
    const configListSection =
      xcodeProject.hash.project.objects['XCConfigurationList'];
    const buildConfigSection = xcodeProject.pbxXCBuildConfigurationSection();

    for (const [, target] of Object.entries(targets)) {
      if (
        target &&
        typeof target === 'object' &&
        typeof target.name === 'string' &&
        target.name.toLowerCase().includes('shareextension')
      ) {
        const configListKey = target.buildConfigurationList;
        const configList = configListSection[configListKey];

        if (configList && configList.buildConfigurations) {
          for (const { value: configKey } of configList.buildConfigurations) {
            const buildConfig = buildConfigSection[configKey];
            if (buildConfig && buildConfig.buildSettings) {
              buildConfig.buildSettings.SWIFT_VERSION = '5';
              buildConfig.buildSettings.SWIFT_STRICT_CONCURRENCY = 'minimal';
            }
          }
        }
      }
    }

    return config;
  });
};
