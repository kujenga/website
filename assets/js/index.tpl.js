/** Build a JSON dictionary of the website content from the Hugo site data, for
 * use in creating the lunr search index.
 *
 * Searchable page structure:
 * - title
 * - tags
 * - content
 * - url
 */

{{- $store := dict }}
{{- /* Filter on just blog pages */}}
{{- $blogs := where .Site.Pages "Section" "blog" }}
{{- range where $blogs "IsPage" true }}
{{- /* Construct an object for the search index from the page */}}
{{- $page := dict
  "title" .Title
  "description" .Description
  "date" (.Date.Format "Jan 2, 2006")
  "tags" .Params.tags
  "content" (.Plain | htmlUnescape)
  "url" .Permalink
}}
{{- $store = merge $store (dict .Permalink $page) }}
{{- end }}
window.store = {{ $store | jsonify }};
