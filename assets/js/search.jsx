/* global $ */
import { h, render } from 'preact';
import lunr from 'lunr';

// Builds the index based in the window.store created in index.tpl.js.
console.time('lunr index build');
const idx = lunr(function () {
  // Search these fields
  this.ref('id');
  this.field('title', {
    boost: 18,
  });
  this.field('description', {
    boost: 12,
  });
  this.field('tags');
  this.field('content', {
    boost: 10,
  });

  // Enable undocumented feature for position information for highlighting.
  // https://github.com/olivernn/lunr.js/issues/25#issuecomment-623267494
  this.metadataWhitelist = ['position'];

  // Add the documents from your search index to
  // provide the data to idx
  for (const key in window.store) {
    this.add({
      id: key,
      title: window.store[key].title,
      description: window.store[key].description,
      date: window.store[key].date,
      tags: window.store[key].category,
      content: window.store[key].content,
    });
  }
});
// Log time it took to create the index.
console.timeEnd('lunr index build');

// Highlight performs highlighting on the passed in text based on the metadata
// with positional informational information. This metadata is expected to be
// in the merged format outputted b mergeMetadata.
const Highlight = (props) => {
  let { text, metadata, maxLen = 340 } = props;
  if (text.length > maxLen) {
    // Trim text that is too long (usually applies to content body)
    text = `${text.slice(0, maxLen)}…`;
  }
  if (!metadata) {
    // Text is returned as-is if there is no metadata for highlighting.
    return text;
  }

  // Re-build the text content as an array, inserting `mark` elements around
  // the positions that match the query.
  const output = [];
  // Keep track of where we are in the re-construction of highlighted text.
  let cur = 0;
  metadata.position.forEach((p) => {
    const [start, len] = p;
    const end = start + len;
    if (start > text.length) {
      return;
    }
    // Add all uncaptured text preceeding the match.
    output.push(text.slice(cur, start));
    // Add text of the match itself, surrounded by `mark` element.
    output.push(
      <mark data-range-start={start} data-range-end={end}>
        {text.slice(start, end)}
      </mark>
    );
    cur = end;
  });
  // Push any remaining text to the array and return.
  output.push(text.slice(cur, text.length));
  return output;
};

/**
 * mergeMetadata re-formats the match metadata of a result from lunr to be
 * better suited for highlighting text sequentially.
 *
 * @param {object} result - The search results to merge metadata for.
 * @returns {object} - Map of field -> match positions, independent of terms.
 */
function mergeMetadata(result) {
  const out = {};
  for (const metadata of Object.values(result.matchData.metadata)) {
    for (const [field, md] of Object.entries(metadata)) {
      if (field in out) {
        out[field].position = out[field].position.concat(md.position);
        // Fields are sorted for convenient use in highlighting.
        out[field].position.sort((a, b) => a[0] - b[0]);
      } else {
        out[field] = md;
      }
    }
  }
  return out;
}

// Result provides rendering for a single result in the list.
const Result = (props) => {
  const { result, item } = props;
  // Merge metadata from different search terms for use in highlighting.
  const metadata = mergeMetadata(result);
  // NOTE: This endeavors to match the format laid out at:
  // layouts/blog/summary.html
  return (
    <li>
      <div class="summary">
        <h4>
          <a href={item.url}>
            <Highlight text={item.title} metadata={metadata.title} />
          </a>
          <small class="pull-right">{item.date}</small>
          <br />
        </h4>
        <h5 class="muted">
          <Highlight text={item.description} metadata={metadata.description} />
        </h5>
        <hr />
        <div>
          <p>
            <Highlight text={item.content} metadata={metadata.content} />
          </p>
        </div>
      </div>
    </li>
  );
};

// ResultList provides rendering for the full list of results in the list.
const ResultList = (props) => {
  const { results, store } = props;
  if (!results.length) {
    return <p>No results found.</p>;
  }

  let resultList = [];
  // Iterate and build result list elements
  for (const n in results) {
    const result = results[n];
    const item = store[result.ref];
    resultList.push(<Result result={result} item={item} />);
  }
  return <ul class="list-unstyled">{resultList}</ul>;
};

// Detect when special query chars are being used:
// https://lunrjs.com/guides/searching.html
const lunrQueryChars = new RegExp('[*:^~+-]');
// Split text on whitespace to augment the query:
// https://stackoverflow.com/a/69457941/2528719
const splitText = new RegExp(/[^\s,]+/g);

/**
 * getResults returns the results for the given query, handling different
 * behaviors based on the input query:
 * - If the query is empty, [] is returned.
 * - If the query has special chars, the default parser is used
 *   https://lunrjs.com/guides/searching.html
 * - If the query is just words, it is parsed and augmented to give more
 *   matching flexibility by default, providing a better UX.
 *
 * @param {string} query - The search query to get results for.
 * @returns {Array} - Array of results corresponding to the query.
 */
function getResults(query) {
  if (!query) {
    return [];
  }
  if (lunrQueryChars.test(query)) {
    // If the query has special characters, use the default parser:
    // https://lunrjs.com/guides/searching.html
    return idx.search(query);
  }

  // If the query has no special characters, we parse it for a better
  // default experience.
  const words = query.match(splitText);

  return idx.query((q) => {
    // Add the all words to the query as-is.
    words.forEach((word) =>
      q.term(word, {
        boost: 5,
      })
    );
    // Add the last word in the query with a trailing wildcard to account for
    // incomplete typing state.
    q.term(words.at(-1), {
      boost: 1,
      wildcard: lunr.Query.wildcard.TRAILING,
    });

    return q;
  });
}

/**
 * update executes the query and updates the UI with the results.
 *
 * @param {string} query - Query to update the UI for.
 */
function update(query) {
  // Perform the search to get results from the lunr index.
  let results = getResults(query);

  // Update the list with rendered results.
  render(
    <ResultList results={results} store={window.store} />,
    document.getElementById('results')
  );
}

/**
 * initialize sets up the webpage based on load-time parameters.
 */
function initialize() {
  // Get the query parameter(s)
  const params = new URLSearchParams(window.location.search);
  const query = params.get('query');

  if (query) {
    // Display the search input in the form for clarity and editability.
    document.getElementById('search-input').setAttribute('value', query);
    // Update the page with corresponding results.
    update(query);
  }

  // Live update the query results as people type on the page.
  // (conditional since tests do not have jQuery at present)
  $('form#search').on(
    'keyup change paste',
    'input, select, textarea',
    function () {
      const query = $(this).val();
      update(query);
    }
  );
}

// At load time, setup the web page.
initialize();

module.exports = {
  getResults,
  update,
  initialize,
};
