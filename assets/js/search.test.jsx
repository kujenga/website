// Mock test data for basic search tests.
window.store = {
  a: {
    title: 'Stargate SG-1',
    description:
      'A secret military team, SG-1, is formed to explore other planets through the recently discovered Stargates.',
    date: '',
    tags: [],
    content: '',
    url: 'a',
  },
  b: {
    title: 'Stargate: Atlantis',
    description:
      'An international team of scientists and military personnel discover a Stargate network in the Pegasus Galaxy and come face-to-face with a new, powerful enemy, The Wraith.',
    date: '',
    tags: [],
    content: '',
    url: 'b',
  },
  c: {
    title: 'Stargate Universe',
    description:
      'Trapped on an Ancient spaceship billions of light-years from home, a group of soldiers and civilians struggle to survive and find their way back to Earth.',
    date: '',
    tags: [],
    content: '',
    url: 'c',
  },
};

// "require" is used here over "import" so that the above values on window are
// available for the setup logic.
const { getResults, update } = require('./search');

describe('getResults', () => {
  test('basic query returns results', () => {
    const results = getResults('atlantis');
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
  // Set up document body, mirroring the HTML site.
  document.body.innerHTML = `
    <div>' +
      <form id="search"><input type="text" id="search-input" /></form>
      <div id="results"></div>
    </div>`;

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
