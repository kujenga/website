import { h, Fragment, render } from 'preact';
import { useState } from 'preact/hooks';

// Builds the index based in the window.store created in index.tpl.js.
const idx = lunr(function () {
  // Search these fields
  this.ref('id');
  this.field('title', {
    boost: 15,
  });
  this.field('description', {
    boost: 12,
  });
  this.field('tags');
  this.field('content', {
    boost: 10,
  });

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

// Result provides rendering for a single result in the list.
const Result = (props) => {
  const { item } = props;
  const summary = item.content.substring(0, 300) + '...';
  // NOTE: This endeavors to match the format laid out at:
  // layouts/blog/summary.html
  return (
    <li>
      <div class="summary">
        <h4>
          <a href={item.url}>{item.title}</a>
          <small class="pull-right">{item.date}</small>
          <br />
        </h4>
        <h5 class="muted">{item.description}</h5>
        <hr />
        <div>
          <p
            // The Hugo renderer outputs safe HTML with characters encoded as
            // HTML, so it is safe and necessary here to set that content directly.
            dangerouslySetInnerHTML={{ __html: summary }}
          ></p>
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
    const item = store[results[n].ref];
    resultList.push(<Result item={item} />);
  }
  return <ul class="list-unstyled">{resultList}</ul>;
};

// update executes the query and updates the UI with teh results.
function update(query) {
  // Perform the search if there is a query.
  let results = [];
  if (query) {
    results = idx.search(query);
  }

  // Update the list with rendered results.
  render(
    <ResultList results={results} store={window.store} />,
    document.getElementById('results')
  );
}

// Get the query parameter(s)
const params = new URLSearchParams(window.location.search);
const query = params.get('query');
// Perform a search if there is a query
if (query) {
  // Retain the search input in the form when displaying results
  document.getElementById('search-input').setAttribute('value', query);

  update(query);
}

// Live update the query results as people type on the page.
$('form#search').on(
  'keyup change paste',
  'input, select, textarea',
  function () {
    const query = $(this).val();
    update(query);
  }
);
