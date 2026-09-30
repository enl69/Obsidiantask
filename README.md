# Obsidiantask

Obsidian plugin untuk mengelola Google Tasks dari side panel. Two-way sync dengan Google Tasks API.

Status: **Fase 0 — OAuth spike** (lihat execution plan).

## Setup

Tutorial lengkap (aktifasi plugin + pembuatan OAuth credential Google): [docs/oauth-setup.md](docs/oauth-setup.md)

## Development

```bash
npm install
npm run build      # typecheck + production bundle
npm run dev        # watch mode
npm test           # unit test (esbuild bundle + node)
```

Install ke vault: copy `main.js`, `manifest.json`, `styles.css` ke `<vault>/.obsidian/plugins/taskbridge/`.

Desktop-only (OAuth loopback memakai Node HTTP server).
