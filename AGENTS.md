# Guidance for Agents

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

Personal website for Aaron Taylor ([ataylor.io](https://ataylor.io)). A Hugo static site served by a Go backend, deployed on Google App Engine via CircleCI.

## Common Commands

### Development
```sh
npm install          # Install dependencies (also inits git submodules via postinstall)
npm start            # Start Hugo dev server with live reload and drafts enabled
npm run start:prod   # Run Go production server locally
npm run build        # Build Hugo site (output: app/site/public)
npm run build:prod   # Build with ENVIRONMENT=production
npm run clean        # Remove build artifacts
```

### Testing
```sh
npm test                              # Jest unit tests (JS/JSX)
npm run test:go                       # Go tests with coverage (runs app/test script)
cd app && go test -run TestName ./... # Run a single Go test
npx jest path/to/file.test.jsx        # Run a single Jest test file
npm run test:e2e                      # Playwright E2E tests (Chromium, Firefox, WebKit)
npx playwright test e2e/site.spec.js  # Run a specific E2E test file
```

### Linting & Formatting
```sh
npm run lint        # Run all linters (script: scripts/lint)
npm run lint:js     # ESLint (JS/JSX)
npm run lint:style  # Stylelint (SCSS/CSS)
npm run lint:html   # Build then validate HTML output
npm run lint:fmt    # Prettier check
npm run fix:fmt     # Prettier auto-fix
```

### Pre-push Hook
The `.husky/pre-push` hook runs `lint`, `test`, and `test:go` before every push.

## Architecture

### Hugo + Embedded Go Server
Hugo generates a static site into `app/site/public/`. The Go server in `app/` embeds these static files into its binary using Go's embed package and serves them with proper caching headers. This solves App Engine's lack of file timestamp support.

### Key Directories
- **`content/`** — Hugo markdown content (blog posts in `content/blog/`, projects in `content/proj/`)
- **`layouts/`** — Hugo templates with standard [lookup order](https://gohugo.io/templates/lookup-order/)
- **`assets/`** — Hugo pipes: JS/JSX (Preact), SCSS, images. Templated files use `.tpl.` suffix (e.g., `main.tpl.scss`, `index.tpl.js`) for Hugo variable injection
- **`app/`** — Go backend: Cobra CLI, Viper config, Zap logging, `unrolled/secure` middleware. Go module is at `app/go.mod`
- **`exp/go-templates/`** — Experimental Go-to-WASM package, built via `make` during build/start
- **`e2e/`** — Playwright browser tests
- **`scripts/`** — Shell scripts for build, start, deploy, linting, environment detection

### Frontend Stack
- **Preact** (not React) for interactive components — JSX uses `h`/`Fragment` factories (configured in jest.config.js and Hugo pipes via esbuild)
- **Lunr.js** for client-side search
- **jQuery** for legacy DOM interactions

### Environment Detection
`scripts/environment` auto-detects from git branch: `main` = production, everything else = staging. Override with `ENVIRONMENT` env var.

### CI/CD (CircleCI)
Build → Deploy to App Engine (main branch only) → E2E verification against deployed site. Config in `.circleci/config.yml`.

## Configuration Files
- `config.toml` — Hugo config (publishes to `app/site/public`)
- `app/app.yaml` — App Engine config (Go 1.23, F1 instance, auto-scaling)
- `app/site/content-security-policy.txt` — CSP loaded by both dev server and production
- `jest.config.js` — Jest with esbuild transformer, Preact aliases, jsdom environment
- `playwright.config.js` — Multi-browser E2E config
