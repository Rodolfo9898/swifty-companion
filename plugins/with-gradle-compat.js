const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

const GRADLE_VERSION = '9.0.0';
const DISTRIBUTION_URL = `https\\://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip`;

function updateGradleWrapper(projectRoot) {
  const wrapperPath = path.join(projectRoot, 'android', 'gradle', 'wrapper', 'gradle-wrapper.properties');

  if (!fs.existsSync(wrapperPath)) {
    return;
  }

  const source = fs.readFileSync(wrapperPath, 'utf8');
  const next = source.replace(
    /^distributionUrl=.*$/m,
    `distributionUrl=${DISTRIBUTION_URL}`
  );

  if (next !== source) {
    fs.writeFileSync(wrapperPath, next);
  }
}

module.exports = function withGradleCompat(config) {
  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      updateGradleWrapper(modConfig.modRequest.projectRoot);
      return modConfig;
    },
  ]);
};
