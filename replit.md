# Replit setup

## Run the app

The `Start application` workflow runs the Vite development server on port 5000 for the Replit preview:

```bash
npm run dev -- --port 5000
```

Install dependencies with `npm install`. Validate changes with `npm run build` and `npm test`.

StationSync uses browser `localStorage` and simulated AMS/MES adapters. It needs no API keys or database, and does not control real factory equipment.
