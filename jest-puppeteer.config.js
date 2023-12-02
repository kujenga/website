// Configuration for the jest-puppeteer plugin.
// https://github.com/smooth-code/jest-puppeteer/blob/master/packages/jest-environment-puppeteer/README.md

module.exports = {
  // Specity launch parameters for puppeteer.
  launch: {
    dumpio: process.env.PUPPETEER_DUMPIO || false,
    headless: process.env.HEADLESS !== 'false' ? 'new' : false,
    product: process.env.BROWSER || 'chrome',
  },
};
