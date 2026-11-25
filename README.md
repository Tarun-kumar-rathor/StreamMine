# StreamMine

## Run with Finnhub

1. Install Node.js 20 or newer, then run `npm install`.
2. Copy `.env.example` to `.env` and set `FINNHUB_API_KEY` to your Finnhub key.
3. Run `npm run dev`. This starts the Vite frontend and the API server together.
4. Open the Vite URL printed in the terminal. The app connects to US equities automatically; use **Finnhub** in the navigation to switch to crypto.

The browser only calls this app's `/api` endpoints. The server reads the Finnhub key from its environment and proxies quote requests, historical OHLC candles, and the live trade WebSocket. Price charts plot Finnhub closing prices for 1H, 1D, 1W, and 1M ranges, with live trades updating the latest price. If Finnhub denies historical-candle access, charts show the real current-day quote instead of disappearing or showing fabricated history. Do not put the key in a `VITE_` variable or commit `.env`.

For production, run `npm run build` and then `npm start` with `FINNHUB_API_KEY` configured in the hosting provider's environment. The API server serves the built frontend and API on the same origin.
If the frontend is hosted on a different origin, set `APP_ORIGINS` on the server to a comma-separated list of allowed frontend origins.

Finnhub credentials are required for live market data. The app no longer includes a simulated/demo session.
