# Mutagen — webapp

A small, real, publicly-hostable demo of mutation XSS (mXSS), built on top of
this repo's own from-scratch HTML engine (`engine/mxss-lab/`) rather than a
reimplementation. See `src/engine/*.mjs` for provenance notes on exactly
which files were reused and from where.

## What it demonstrates

1. **Sanitize** — a real DOM-walking sanitizer (either the intentionally
   buggy one from Module 5, or its hardened fix) parses your HTML/SVG
   snippet, cleans it, and re-serializes it to a string.
2. **Re-parse** — that cleaned string is fed to a real browser parser again,
   isolated inside a sandboxed `<iframe sandbox="allow-scripts">` (no
   `allow-same-origin`) via `srcdoc`. If the "cleaned" output is still
   dangerous, the payload's own script call proves it, and the sandboxed
   frame reports the fact back to the page via `postMessage` — it never runs
   anything against the real page.

The default example is the "image alias" vector from
`track2-mxss/05-mxss-namespace/`: `<svg><image href=x onerror=alert(1)></svg>`,
verified in that module's test suite to survive the naive sanitizer and go
live on reparse, and to be blocked by the hardened one.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output goes to `dist/`.

## Deploying

This is a fully static site — no backend, no environment variables.

- **Vercel / Netlify / Cloudflare Pages**: set the project root to `webapp`,
  build command `npm run build`, output directory `dist`.
- Or serve `dist/` from any static file host after running the build above.
