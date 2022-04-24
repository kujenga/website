/* global page */
import 'expect-puppeteer';

import { getTargetURL } from './env';

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

  it('should have a functioning go templates playground', async () => {
    // Navigate to the URL for a blog post with all assets.
    await page.evaluate(
      () => (window.location.pathname = '/exp/go-templates/')
    );
    // Wait for rendered text area to appear.
    await page.waitForSelector('textarea#renderTextArea');
    // Expect that the default inputs are present.
    expect(
      await page.evaluate(
        () => document.getElementById('templateTextArea').value
      )
    ).toBe('Hello, {{ .Name }}!');
    expect(
      await page.evaluate(() => document.getElementById('dataTextArea').value)
    ).toBe('Name: World');
    // Expect that the default output is rendered.
    expect(
      await page.evaluate(() => document.getElementById('renderTextArea').value)
    ).toBe('Hello, World!');
  });
});
