# Code Notebook / TypeScript Playground

This repository contains a small Quarto website that works as a personal code notebook and TypeScript playground. It is designed to be published as a GitHub Pages project site at:

- `https://coosigma.github.io/code-notes`

## Features

- Quarto website built from `.qmd` sources into the `docs/` folder.
- Interactive TypeScript/JavaScript playground pages using Observable JS (OJS):
  - Edit code in a textarea and run it manually via a ▶ button.
  - TypeScript is transpiled in the browser (using `typescript.js`) before execution.
  - Console output is captured and shown inline in the page.
- A simple "QFactory" page that will later generate a Next.js scaffold script.

## Project structure

- `_quarto.yml` – Quarto project configuration (website, navbar, output dir).
- `index.qmd` – Landing page with the main TypeScript notebook.
- `pages/ts-notes.qmd` – Secondary TypeScript notes notebook.
- `pages/ts-playground.qmd` – Dedicated TypeScript/JavaScript playground.
- `pages/configure-next.qmd` – QFactory page for future Next.js scaffolding.
- `docs/` – Rendered HTML site output (served by GitHub Pages).

## Local development

Prerequisites:

- Quarto CLI installed (on macOS, e.g. via Homebrew: `brew install quarto`)
- Node.js >= 18 recommended (for working with generated scripts or future features).

To preview the site locally:

```bash
quarto preview
```

To render the site into the `docs/` folder:

```bash
quarto render
```

## Deploying to GitHub Pages

This repository is intended to be used as a GitHub Pages project site:

1. The remote is set to `git@github.com:coosigma/code-notes.git`.
2. The Quarto project outputs to the `docs/` directory.
3. In GitHub, under **Settings → Pages**, configure:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main`
   - **Folder**: `/docs`

After pushing changes and rendering `docs/`, GitHub Pages will serve the site at `https://coosigma.github.io/code-notes`.
