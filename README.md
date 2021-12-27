# Personal Website

[![CircleCI](https://circleci.com/gh/kujenga/website.svg?style=svg)][ci]

Built with [Hugo][hugo] and deployed on [Google App Engine][gae] via
[CircleCI][ci]. See it deployed at [ataylor.io](https://ataylor.io).

Directories are laid out as follows:
- `app` contains source code for the App Engine application.
  - `app/site/public` is where static assets from the Hugo site are built for
    embedding into the server binary and deployment within App Engine.
- `assets` is the Hugo assets directory for management via [pipes][hugoPipes].
- `content` is the Hugo directory for blog and other [page
  content][hugoContent], mirroring the organization of the site.
- `data` is the Hugo [data directory][hugoData] for various pieces of data such
  as external posts of interest.
- `layouts` is the Hugo directory for [templates][hugoTemplates], which have a
  very specific [lookup order][hugoLookup] determining which templates are used
  where. A few examples of these layouts are:
  - `layouts/index.html` is the homepage for the site.
  - `layouts/_default` contains default templates for when no specific template
    is defined.
  - `layouts/partials` contain reusable snippets for inclusion in other
    templates.
- `scripts` is a collection of utility scripts for working with the repo and
  things like deployment management.
- `static` contains [static files][hugoStatic] deployed as-is by Hugo.
- `tools` contains installation logic for the tooling needed for building this
  repo, in particular pinning an install of Hugo to the [desired
  version][hugoReleases].

## Development

To install dependencies, run the following commands:

```
npm install
```

```
cd tools
./install-tools
```

To run the application, perform the following commands:

```
npm run start
```

To run the tests, perform the following commands:

```
npm test
```

```
cd app
go test -v ./...
```

To run the browser automation E2E tests, perform the following command:

```
npm run test:e2e
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
