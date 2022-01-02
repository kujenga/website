/* global page */
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

describe('Site', () => {
  beforeAll(async () => {
    const targetURL = getTargetURL();
    console.log('testing at:', targetURL);
    await page.goto(targetURL);
  });

  it('should be titled with my name', async () => {
    await expect(page.title()).resolves.toContain('Aaron Taylor');
  });

  it('should properly execute search queries', async () => {
    // Enter a text query and submit it.
    await page.evaluate(
      () =>
        (document.querySelector('input[name=query]').value = 'neural network')
    );
    await page.evaluate(() =>
      document.querySelector('button[type="submit"]').click()
    );
    // Wait for results and check that there is at least one of them.
    await page.waitForSelector('div#results');
    await page.waitForSelector('li > div.summary');
    await expect(page).toMatch('the basics of what neural networks are');
  });

  it('should properly load blog assets', async () => {
    // Navigate to the URL for a blog post with all assets.
    await page.evaluate(() => (window.location.pathname = '/blog/go-mlp/'));
    // Wait for main blog div to appear.
    await page.waitForSelector('div.type-blog');
    await expect(page).toMatch('multi-layer perceptron from scratch');
    // Wait for mathjax rendering to appear.
    await page.waitForSelector('mjx-math');
    // Wait for emgithub to appear.
    await page.waitForSelector('div.emgithub-container');
    // Wait for giscus comments to appear.
    await page.waitForSelector('iframe.giscus-frame');
  });
});
