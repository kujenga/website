import 'expect-puppeteer';

describe('Homepage', () => {
  beforeAll(async () => {
    await page.goto('https://ataylor.io');
  });

  it('should be titled with my name', async () => {
    await expect(page.title()).resolves.toContain('Aaron Taylor');
  });
});
