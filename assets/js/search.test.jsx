/* global $ */
import { readFileSync } from 'fs';
import { h } from 'preact';

beforeAll(() => {
  // Without this, h is not defined when we call the tests, for some reason.
  global.h = h;
});

// Provide jquery in a global context. This approach is used rather than a
// direct import because jquery is used across pages and imported from a global
// script tag so that the load is cached efficiently.
global.$ = require('jquery');

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
  // Mock window location based on:
  // https://remarkablemark.org/blog/2018/11/17/mock-window-location/
  const { location } = window;

  beforeAll(() => {
    delete window.location;
    window.location = { reload: jest.fn() };

    // Setup the window.location with a parsable URL.
    window.location.search = '?query=sg-1';
    // Set up document body, mirroring the HTML site.
    document.body.innerHTML = searchHTML;
  });

  afterAll(() => {
    window.location = location;
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
    // Manual trigger seems to be needed with jsdom:
    // https://www.htmlgoodies.com/javascript/testing-dom-events-using-jquery-and-jasmine-2-0/
    $(input).trigger('keyup');

    // Expect three results rather than just 1 for the "stargate" query.
    const results = document.querySelectorAll('#results > ul > li');
    expect(results).toHaveLength(3);
  });
});
