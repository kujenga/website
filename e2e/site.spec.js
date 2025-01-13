import { test, expect } from '@playwright/test';
import { getTargetURL } from './env';

const targetURL = getTargetURL();

test.describe('Site', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(targetURL);
  });

  test('should be titled with my name', async ({ page }) => {
    await expect(page).toHaveTitle(/Aaron Taylor/);
  });

  test('should properly execute search queries', async ({ page }) => {
    // Enter a text query and submit it
    await page.fill('input[name=query]', 'neural network');
    await page.click('button[type="submit"]');

    // Wait for results and check that there is at least one of them
    await page.waitForSelector('div#results');
    await page.waitForSelector('li > div.summary');
    await expect(page.locator('body')).toContainText(
      'the basics of what neural networks are'
    );
  });

  test('should properly load blog assets', async ({ page }) => {
    // Navigate to the URL for a blog post with all assets
    await page.goto(`${targetURL}/blog/go-mlp/`);

    // Wait for main blog div to appear
    await page.waitForSelector('div.type-blog');
    await expect(page.locator('body')).toContainText(
      'multi-layer perceptron from scratch'
    );

    // Wait for various components to load
    await page.waitForSelector('mjx-math');
    await page.waitForSelector('div.emgithub-container');
    await page.waitForSelector('iframe.giscus-frame');
  });

  test('should have a functioning go templates playground', async ({
    page,
  }) => {
    // Navigate to the templates page
    await page.goto(`${targetURL}/exp/go-templates/`);

    // Wait for rendered text area to appear
    await page.waitForSelector('textarea#renderTextArea');

    // Check default inputs
    const templateText = await page.inputValue('#templateTextArea');
    expect(templateText).toBe('Hello, {{ .Name }}!');

    const dataText = await page.inputValue('#dataTextArea');
    expect(dataText).toBe('Name: World');

    // Check default output
    const renderText = await page.inputValue('#renderTextArea');
    expect(renderText).toBe('Hello, World!');
  });
});
