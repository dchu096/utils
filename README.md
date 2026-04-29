# dchu096.tk Utilities

Utility-focused Vite + React app for browser-side tools covering validation, encoding, text work, security, Discord helpers, and Minecraft formatting.

## What this repo is

This project is a multi-page static tools site built with:

- `React 19`
- `TypeScript`
- `Vite`
- `Tailwind CSS`

The site is designed around direct-use utilities rather than docs or marketing pages. Each tool has its own route, metadata, and canonical URL.

## Tool areas

Current tool groups include:

- `Data & Encoding`
  - Base64 / URL Encoder
  - JWT Decoder
  - UUID Generator
- `Time & Scheduling`
  - Timestamp Generator
  - Discord Timestamp Generator
  - Cron Expression Generator
- `Text & Formatting`
  - Markdown Previewer
  - Regex Tester
- `Validators`
  - YAML Validator
  - JSON Validator
  - TOML Validator
- `Security & PKI`
  - SSH Key Generator
  - Extract Public Key
  - JWK Generator
  - JWK to PEM Convert
- `Design & Creative`
  - QR Code Generator
  - CSS Gradient Generator
  - Discord Webhook Builder
- `Minecraft`
  - Flags Generator
  - MOTD Generator
  - MiniMessage Previewer
  - Minecraft Gradient Text Generator

## Local development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Useful scripts:

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run typecheck
npm run seo
```

## Build output

Production build:

```bash
npm run build
```

This does two things:

1. builds the multi-page site into `dist/`
2. generates `sitemap.xml` and `robots.txt`

The SEO files are generated from the route entry pages and their canonical links.

## Project structure

High-signal directories:

- `src/components/` - tool UIs
- `src/utils/` - shared parsing, rendering, and key helpers
- `design/`, `encoding/`, `minecraft/`, `security/`, `text/`, `time/`, `validators/` - per-route HTML entries
- `scripts/generate-seo.mjs` - sitemap and robots generation

## Notes

- Tools are intended to run client-side where practical.
- Sensitive inputs such as webhook URLs and generated keys are handled in-browser and are not persisted by the app.
- The site is configured as a multi-page Vite app rather than a single routed document export.
