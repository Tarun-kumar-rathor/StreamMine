import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocket, WebSocketServer } from 'ws';

const app = express();
const httpServer = app.listen(Number(process.env.PORT) || 3001, () => {
  console.log(`StreamMine API listening on port ${Number(process.env.PORT) || 3001}`);
});
const webSocketServer = new WebSocketServer({ noServer: true });
const allowedSymbols = new Set([
  'AAPL', 'MSFT', 'NVDA', 'AMD', 'META', 'INFY', 'TCS', 'RELIANCE',
  'XOM', 'HDB', 'HDFCBANK', 'JPM',
  'BINANCE:BTCUSDT', 'BINANCE:ETHUSDT', 'BINANCE:SOLUSDT',
  'BINANCE:BNBUSDT', 'BINANCE:XRPUSDT',
]);

function getApiKey() {
  return process.env.FINNHUB_API_KEY?.trim();
}

function isAllowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const configuredOrigins = (process.env.APP_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (configuredOrigins.includes(origin)) return true;
  try {
    const parsedOrigin = new URL(origin);
    if (
      parsedOrigin.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(parsedOrigin.hostname)
    ) return true;
    return parsedOrigin.host === req.headers.host;
  } catch {
    return false;
  }
}

app.get('/api/status', (_req, res) => {
  res.json({ configured: Boolean(getApiKey()) });
});

app.get('/api/quote', async (req, res) => {
  const symbol = typeof req.query.symbol === 'string' ? req.query.symbol : '';
  if (!allowedSymbols.has(symbol)) {
    res.status(400).json({ error: 'Unsupported symbol' });
    return;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({ error: 'Finnhub API key is not configured on the server' });
    return;
  }

  try {
    const url = new URL('https://finnhub.io/api/v1/quote');
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('token', apiKey);
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const payload = await response.json();
    if (!response.ok || (typeof payload.error === 'string')) {
      res.status(response.status || 502).json({
        error: typeof payload.error === 'string' ? payload.error : 'Finnhub quote request failed',
      });
      return;
    }
    res.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Finnhub quote request failed';
    res.status(502).json({ error: message });
  }
});

app.get('/api/candles', async (req, res) => {
  const symbol = typeof req.query.symbol === 'string' ? req.query.symbol : '';
  const range = typeof req.query.range === 'string' ? req.query.range : '';
  const rangeConfig = {
    '1H': { resolution: '1', seconds: 60 * 60 },
    '1D': { resolution: '5', seconds: 24 * 60 * 60 },
    '1W': { resolution: '60', seconds: 7 * 24 * 60 * 60 },
    '1M': { resolution: 'D', seconds: 30 * 24 * 60 * 60 },
  }[range];
  if (!allowedSymbols.has(symbol) || !rangeConfig) {
    res.status(400).json({ error: 'Unsupported symbol or chart range' });
    return;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({ error: 'Finnhub API key is not configured on the server' });
    return;
  }

  try {
    const endpoint = symbol.startsWith('BINANCE:') ? 'crypto/candle' : 'stock/candle';
    const url = new URL(`https://finnhub.io/api/v1/${endpoint}`);
    const to = Math.floor(Date.now() / 1000);
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('resolution', rangeConfig.resolution);
    url.searchParams.set('from', String(to - rangeConfig.seconds));
    url.searchParams.set('to', String(to));
    url.searchParams.set('token', apiKey);

    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const payload = await response.json();
    if (!response.ok || payload.s === 'error' || typeof payload.error === 'string') {
      res.status(response.status || 502).json({
        error: typeof payload.error === 'string' ? payload.error : 'Finnhub candle request failed',
      });
      return;
    }
    if (payload.s === 'no_data') {
      res.json({ s: 'no_data' });
      return;
    }

    const arrays = [payload.t, payload.o, payload.h, payload.l, payload.c, payload.v];
    if (
      payload.s !== 'ok' ||
      arrays.some((values) => !Array.isArray(values)) ||
      arrays.some((values) => values.length !== payload.t.length) ||
      arrays.some((values) => values.some((value) => !Number.isFinite(value)))
    ) {
      res.status(502).json({ error: 'Finnhub returned invalid candle data' });
      return;
    }
    res.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Finnhub candle request failed';
    res.status(502).json({ error: message });
  }
});

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendDirectory = path.join(rootDirectory, 'dist');
app.use(express.static(frontendDirectory));
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) {
    next();
    return;
  }
  res.sendFile(path.join(frontendDirectory, 'index.html'), (error) => {
    if (error) next(error);
  });
});

httpServer.on('upgrade', (req, socket, head) => {
  const requestUrl = new URL(req.url ?? '/', 'http://localhost');
  if (requestUrl.pathname !== '/api/stream') {
    socket.destroy();
    return;
  }
  if (!isAllowedOrigin(req)) {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }
  webSocketServer.handleUpgrade(req, socket, head, (client) => {
    webSocketServer.emit('connection', client, req);
  });
});

webSocketServer.on('connection', (client, req) => {
  const requestUrl = new URL(req.url ?? '/', 'http://localhost');
  const requestedSymbols = requestUrl.searchParams.get('symbols')?.split(',') ?? [];
  const symbols = [...new Set(requestedSymbols)];
  const apiKey = getApiKey();

  const sendStatus = (state, message) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'status', state, message }));
    }
  };

  if (!apiKey) {
    sendStatus('error', 'Finnhub API key is not configured on the server');
    client.close(1011);
    return;
  }
  if (symbols.length === 0 || symbols.length > 20 || symbols.some((symbol) => !allowedSymbols.has(symbol))) {
    sendStatus('error', 'Invalid or unsupported Finnhub symbols');
    client.close(1008);
    return;
  }

  const upstream = new WebSocket(`wss://ws.finnhub.io?token=${encodeURIComponent(apiKey)}`);
  upstream.on('open', () => {
    sendStatus('connected', 'Finnhub WebSocket connected through server');
    symbols.forEach((symbol) => upstream.send(JSON.stringify({ type: 'subscribe', symbol })));
  });
  upstream.on('message', (data) => {
    const message = data.toString();
    try {
      const payload = JSON.parse(message);
      if (payload.type === 'ping') {
        upstream.send(JSON.stringify({ type: 'pong' }));
        return;
      }
      if (payload.type === 'error') {
        sendStatus('error', typeof payload.msg === 'string' ? payload.msg : 'Finnhub subscription error');
      }
    } catch {
      sendStatus('error', 'Malformed Finnhub WebSocket payload');
      return;
    }
    if (client.readyState === WebSocket.OPEN) client.send(message);
  });
  upstream.on('error', () => sendStatus('error', 'Finnhub WebSocket connection error'));
  upstream.on('close', () => {
    sendStatus('closed', 'Finnhub WebSocket closed');
    if (client.readyState === WebSocket.OPEN) client.close();
  });
  client.on('close', () => {
    if (upstream.readyState === WebSocket.OPEN || upstream.readyState === WebSocket.CONNECTING) {
      upstream.close();
    }
  });
  client.on('error', () => {
    if (upstream.readyState === WebSocket.OPEN || upstream.readyState === WebSocket.CONNECTING) {
      upstream.close();
    }
  });
});

httpServer.on('error', (error) => {
  console.error('StreamMine API server error:', error);
  process.exitCode = 1;
});
