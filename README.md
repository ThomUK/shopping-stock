# Shopping Stock

A private, barcode-driven domestic food stock manager. Scan a product when you cook with it or throw it away → it comes off the stock list and onto the shopping list. Scan it again when you unpack the shopping → it goes back into stock.

Built as a static Progressive Web App that commits its data as JSON to a private GitHub repo you own. No server, no third-party database, every change is a git commit you can audit.

## How it works

- **Scanning** uses the phone camera via the `BarcodeDetector` API (Chrome Android, modern Safari) with an automatic `@zxing/browser` fallback (iOS Safari, older browsers).
- **Product names** are looked up against [OpenFoodFacts](https://world.openfoodfacts.org) and cached locally in `catalog.json` so offline scans still resolve. Unknown barcodes prompt for a manual name once.
- **Data** lives in three JSON files (`stock.json`, `shopping-list.json`, `catalog.json`) in a **separate private repo** of your choosing. The app talks to the GitHub Contents API using a fine-grained Personal Access Token that you paste in on first run. The token is stored only in your browser's local storage.
- **Offline** scans are applied to local state and IndexedDB immediately and pushed to GitHub when the browser comes back online.

## Setup

1. Create a **private** GitHub repo to hold your inventory data (any name; `my-kitchen-stock` for example).
2. Create a **fine-grained Personal Access Token** scoped to just that repo, with `Contents: read and write`. Copy it — you only get to see it once.
3. Visit the deployed app, open **Settings**, enter the owner/repo/branch and paste the PAT. Press Connect.
4. Head to **Scan**, pick a mode, point the camera at a barcode. Done.

## Local development

```bash
npm install
npm run dev -- --host
```

Camera access requires HTTPS when you're not on `localhost`. To test on a phone, expose the dev server with a tunnel:

```bash
cloudflared tunnel --url http://localhost:5173
# or: ngrok http 5173
```

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the PWA and publishes it to GitHub Pages. The first deploy needs Pages enabled in repository Settings → Pages → Source: GitHub Actions.

The production URL will be `https://<owner>.github.io/shopping-stock/`.

## Data format

`stock.json`

```json
{ "version": 1,
  "items": { "5010029217216": { "name": "Baked Beans", "brand": "Heinz", "qty": 3, "lastUpdated": "2026-04-20T12:00:00Z" } } }
```

`shopping-list.json`

```json
{ "version": 1,
  "items": { "5010029217216": { "name": "Baked Beans", "qty": 1, "addedAt": "2026-04-20T12:00:00Z" } } }
```

`catalog.json` (product-metadata cache)

```json
{ "version": 1,
  "products": { "5010029217216": { "name": "Baked Beans", "brand": "Heinz", "source": "off", "cachedAt": "2026-04-20T12:00:00Z" } } }
```

The top-level `version` field lets future releases migrate the schema safely.
