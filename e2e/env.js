// Environment configuration helpers.

const { existsSync, readFileSync } = require('fs');

/**
 * Get the URL for the target website from the environment.
 *
 * @returns {string} - URL for the website to test against.
 */
function getTargetURL() {
  if (process.env.TARGET_URL) {
    // IF a TARGET_URL env var is specified, utilize that first.
    return process.env.TARGET_URL.trim();
  }
  if (existsSync('./VERSION_URL')) {
    // Read the VERSION_URL from disk based on the output of the
    // deploy-appengine script, executed in CI environments.
    return readFileSync('./VERSION_URL', 'utf8').trim();
  }
  // In CI environments, we want to make sure that one of the above options is
  // used, since there is little purpose testing the default application.
  if (process.env.CI) {
    throw new Error('must have explicit version in CI');
  }
  return 'https://ataylor.io';
}

module.exports = {
  getTargetURL,
};

// If this is called as a script, we output the value of the target URL.
if (require.main === module) {
  console.log(getTargetURL());
}
