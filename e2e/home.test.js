import 'expect-puppeteer';
import { existsSync, readFileSync } from 'fs';

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

describe('Homepage', () => {
  beforeAll(async () => {
    const targetURL = getTargetURL();
    console.log('testing at:', targetURL);
    await page.goto(targetURL);
  });

  it('should be titled with my name', async () => {
    await expect(page.title()).resolves.toContain('Aaron Taylor');
  });
});
