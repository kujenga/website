import { readFileSync } from 'fs';
import { h } from 'preact';

beforeAll(() => {
  // Without this, h is not defined when we call the tests, for some reason.
  global.h = h;
});

// HTML from the search page for use with tests.
// NOTE: "build" must have been run for this to work.
const searchHTML = readFileSync('./app/site/public/search/index.html');

// Mock test data for basic search tests.
window.store = {
  a: {
    title: 'Stargate SG-1',
    description:
      'A secret military team, SG-1, is formed to explore other planets through the recently discovered Stargates.',
    date: '1997',
    tags: [],
    content: '',
    url: 'a',
  },
  b: {
    title: 'Stargate: Atlantis',
    description:
      'An international team of scientists and military personnel discover a Stargate network in the Pegasus Galaxy and come face-to-face with a new, powerful enemy, The Wraith.',
    date: '2004',
    tags: [],
    content: '',
    url: 'b',
  },
  c: {
    title: 'Stargate Universe',
    description:
      'Trapped on an Ancient spaceship billions of light-years from home, a group of soldiers and civilians struggle to survive and find their way back to Earth.',
    date: '2009',
    tags: [],
    content: '',
    url: 'c',
  },
};

// "require" is used here over "import" so that the above values on window are
// available for the setup logic.
const { getResults, update, initialize } = require('./search');

describe('getResults', () => {
  test('basic query returns results', () => {
    const results = getResults('atlantis');
    expect(results).toHaveLength(1);
  });

  test('Uppercase query returns results', () => {
    const results = getResults('ATLANTIS');
    expect(results).toHaveLength(1);
  });

  test('advanced query returns results', () => {
    const results = getResults('ancien*');
    expect(results).toHaveLength(1);
  });

  test('unrelated query returns no results', () => {
    const results = getResults('mars');
    expect(results).toHaveLength(0);
  });

  test('absent query returns no results', () => {
    const results = getResults();
    expect(results).toHaveLength(0);
  });
});

describe('update', () => {
  document.body.innerHTML = searchHTML;

  test('update with basic query', () => {
    update('stargate');
    const results = document.querySelectorAll('#results > ul > li');
    expect(results).toHaveLength(3);
  });

  test('update with no result query', () => {
    update('mars');
    const results = document.querySelectorAll('#results > ul > li');
    expect(results).toHaveLength(0);
  });

  test('update with no query', () => {
    update();
    const results = document.querySelectorAll('#results > ul > li');
    expect(results).toHaveLength(0);
  });
});

describe('initialize', () => {
  beforeAll(() => {
    // Set the URL query parameter using the history API, which is supported
    // by jsdom without triggering navigation errors (unlike direct
    // window.location assignment which is blocked in jsdom v25+).
    window.history.pushState({}, '', '?query=sg-1');
    // Set up document body, mirroring the HTML site.
    document.body.innerHTML = searchHTML;
  });

  afterAll(() => {
    window.history.pushState({}, '', '/');
  });

  test('initialize with basic query', () => {
    initialize();

    const input = document.getElementById('search-input');
    expect(input.value).toContain('sg-1');

    // Expect a single result for "sg-1" query.
    const results = document.querySelectorAll('#results > ul > li');
    expect(results).toHaveLength(1);
  });

  test('initialize with changed', () => {
    initialize();

    // New query gets more results.
    const input = document.getElementById('search-input');
    input.value = 'stargate';
    // Manual trigger seems to be needed with jsdom; bubbles so the delegated
    // listener on the form sees it.
    input.dispatchEvent(new window.Event('keyup', { bubbles: true }));

    // Expect three results rather than just 1 for the "stargate" query.
    const results = document.querySelectorAll('#results > ul > li');
    expect(results).toHaveLength(3);
  });
});
