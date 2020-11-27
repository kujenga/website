# Personal Website

[![CircleCI](https://circleci.com/gh/kujenga/website.svg?style=svg)][ci]

Built with [Hugo][hugo] and deployed on [Google App Engine][gae] via
[CircleCI][ci]. See it deployed at [ataylor.io](https://ataylor.io).

Directories are laid out as follows:
- `app` is the App Engine application
  - `app/public` is where static assets from the Hugo site are built for
    deployment to App Engine.
- `assets` is the Hugo assets directory for management via [pipes][hugoPipes].
- `content` is the Hugo directory for blog and other [page
  content][hugoContent], mirroring the organization of the site.
- `data` is the Hugo data directory for various pieces of data such as external
  posts of interest.
- `layouts` is the Hugo directory for [templates][hugoTemplates], which have a
  very specific [lookup order][hugoLookup] determining which templates are used
  where.
  - `layouts/index.html` is the homepage for the site.
  - `layouts/_default` contains default templates for when no specific template
    is defined.
  - `layouts/partials` contain reusable snippets for inclusion in other
    templates.
- `scripts` is a collection of utility scripts for working with the repo and
  things like deployment management.
- `static` is for [static files][hugoStatic] handled as-is by Hugo .
- `tools` contains tooling needed for building this repo, in particular pinning
  an install of Hugo to the [desired version][hugoReleases].

## Development

```
npm install
npm run start
```

<!-- Citations -->
[hugo]: https://gohugo.io
[gae]: https://cloud.google.com/appengine
[ci]: https://circleci.com/gh/kujenga/website
[hugoPipes]: https://gohugo.io/hugo-pipes/introduction/
[hugoContent]: https://gohugo.io/content-management/organization/
[hugoData]: https://gohugo.io/templates/data-templates/
[hugoTemplates]: https://gohugo.io/templates/introduction/
[hugoLookup]: https://gohugo.io/templates/lookup-order/
[hugoStatic]: https://gohugo.io/content-management/static-files/
[hugoReleases]: https://github.com/gohugoio/hugo/releases
