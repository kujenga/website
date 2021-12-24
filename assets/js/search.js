const idx = lunr(function () {
  // Search these fields
  this.ref('id');
  this.field('title', {
    boost: 15,
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
      tags: window.store[key].category,
      content: window.store[key].content,
    });
  }
});

function display(results, store) {
  const searchResults = document.getElementById('results');
  if (results.length) {
    let resultList = '';
    // Iterate and build result list elements
    for (const n in results) {
      const item = store[results[n].ref];
      resultList +=
        '<li><p><a href="' + item.url + '">' + item.title + '</a></p>';
      resultList += '<p>' + item.content.substring(0, 150) + '...</p></li>';
    }
    searchResults.innerHTML = resultList;
  } else {
    searchResults.innerHTML = 'No results found.';
  }
}

function update(query) {
  const params = new URLSearchParams(window.location.search);
  params.set('query', query);
  // window.location.search = params;

  // Perform the search if there is a query.
  let results = [];
  if (query) {
    results = idx.search(query);
  }

  // Update the list with results
  display(results, window.store);
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
