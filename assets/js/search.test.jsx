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
const { getResults } = require('./search');

test('basic query returns results', () => {
  const results = getResults('atlantis');
  expect(results).toHaveLength(1);
});
