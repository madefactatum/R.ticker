# EDGAR Deal Tape

A live scrolling ticker tape that displays recent M&A and securities filings from the SEC EDGAR database, designed to be embedded in Google Sites or any webpage via iframe.

## What it shows

- **S-4 / S-4/A** — Merger registration statements
- **F-4 / F-4/A** — Foreign company merger registrations
- **SC TO-T** — Third-party tender offers
- **SC TO-I** — Issuer tender offers
- **SC 13E-3** — Going-private transactions

## Key technologies

- **TanStack Start** (React) — full-stack React framework
- **Netlify Functions** — scheduled hourly fetch of SEC EDGAR data
- **Netlify Blobs** — object storage for caching filing data
- **Tailwind CSS** — admin dashboard styling
- **SEC EDGAR Full-Text Search API** — real-time data source

## How to run locally

```bash
npm install
netlify dev --port 8889
```

The ticker tape is at `http://localhost:8889/ticker`.
The admin dashboard is at `http://localhost:8889/`.

To manually trigger the EDGAR fetch locally:

```bash
netlify functions:invoke fetch-edgar
```

## Embedding in Google Sites

1. Open your Google Site
2. Insert → Embed
3. Paste your deployed ticker URL: `https://<your-site>.netlify.app/ticker`
4. Resize the embed block to about 80–100px tall

Or use the **Custom HTML** widget and paste the iframe code shown on the admin dashboard.
