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
{{- range where .Site.Pages "Section" "blog" }}
{{- $page := dict "title" .Title "description" .Description "tags" .Params.tags "content" (.Content | plainify) "url" .Permalink }}
{{- $store = merge $store (dict .Permalink $page) }}
{{- end }}
window.store = {{ $store | jsonify }};
