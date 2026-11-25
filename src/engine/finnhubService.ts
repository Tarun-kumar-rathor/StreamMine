import { StockAsset, StockTick } from '../types/marketMining';

interface FinnhubQuote {
  c: number;
  pc: number;
  o?: number;
  h?: number;
  l?: number;
  t?: number;
}

export type FinnhubChartRange = '1H' | '1D' | '1W' | '1M';

export class FinnhubRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'FinnhubRequestError';
  }
}

export interface FinnhubCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const candleAccessDenied = new Set<'stock' | 'crypto'>();

interface FinnhubMessage {
  type: string;
  data?: Array<{ s: string; p: number; v: number; t: number }>;
  state?: 'connected' | 'error' | 'closed';
  message?: string;
  msg?: string;
}

async function getFinnhubQuote(symbol: string, signal?: AbortSignal): Promise<FinnhubQuote> {
  const res = await fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`, { signal });
  const json = await res.json() as FinnhubQuote & { error?: string };
  if (!res.ok || (typeof json.error === 'string')) {
    throw new FinnhubRequestError(
      typeof json.error === 'string' ? json.error : `Finnhub request failed (${res.status})`,
      res.status
    );
  }
  if (typeof json.c !== 'number' || typeof json.pc !== 'number') {
    throw new Error('Finnhub returned an invalid quote response');
  }
  return json;
}

export async function fetchFinnhubQuote(symbol: string, signal?: AbortSignal): Promise<FinnhubQuote> {
  return getFinnhubQuote(symbol, signal);
}

export async function testFinnhubConnection(): Promise<FinnhubQuote> {
  return getFinnhubQuote('AAPL');
}

export async function fetchFinnhubCandles(
  symbol: string,
  range: FinnhubChartRange,
  signal?: AbortSignal
): Promise<FinnhubCandle[]> {
  const provider = symbol.startsWith('BINANCE:') ? 'crypto' : 'stock';
  if (candleAccessDenied.has(provider)) {
    throw new FinnhubRequestError('Finnhub historical candles are unavailable for this account', 403);
  }

  const query = new URLSearchParams({ symbol, range });
  const response = await fetch(`/api/candles?${query}`, { signal });
  const payload = await response.json() as {
    s?: string;
    t?: number[];
    o?: number[];
    h?: number[];
    l?: number[];
    c?: number[];
    v?: number[];
    error?: string;
  };
  const { s, t, o, h, l, c, v } = payload;
  if (!response.ok) {
    if (response.status === 403) candleAccessDenied.add(provider);
    throw new FinnhubRequestError(
      payload.error ?? `Finnhub candle request failed (${response.status})`,
      response.status
    );
  }
  if (s === 'no_data') return [];
  if (
    s !== 'ok' ||
    !t || !o || !h || !l || !c || !v ||
    [o, h, l, c, v].some((values) => values.length !== t.length)
  ) {
    throw new Error('Finnhub returned invalid candle data');
  }
  return t.map((time, index) => ({
    time,
    open: o[index],
    high: h[index],
    low: l[index],
    close: c[index],
    volume: v[index],
  }));
}

export async function fetchQuoteBaselines(
  assets: StockAsset[]
): Promise<{ baselines: Record<string, number>; previousCloses: Record<string, number> }> {
  const baselines: Record<string, number> = {};
  const previousCloses: Record<string, number> = {};
  await Promise.all(assets.slice(0, 6).map(async (asset) => {
    try {
      const json = await getFinnhubQuote(asset.symbol);
      if (typeof json.c === 'number' && json.c > 0) baselines[asset.symbol] = json.c;
      if (typeof json.pc === 'number' && json.pc > 0) previousCloses[asset.symbol] = json.pc;
    } catch (error) {
      if (asset === assets[0]) throw error;
    }
  }));
  return { baselines, previousCloses };
}

export class FinnhubStreamClient {
  private ws: WebSocket | null = null;
  private emaPrice: Record<string, number> = {};
  private emaVolume: Record<string, number> = {};
  private subscribedSymbols: string[] = [];
  private previousCloses: Record<string, number> = {};

  connect(assets: StockAsset[], onTrades: (ticks: StockTick[]) => void, onStatus: (state: 'connected' | 'error' | 'closed', message: string) => void) {
    this.disconnect();
    this.subscribedSymbols = assets.map((asset) => asset.symbol);
    const assetMap = new Map(assets.map((asset) => [asset.symbol, asset]));
    assets.forEach((asset) => {
      this.emaPrice[asset.symbol] = asset.basePrice;
      this.emaVolume[asset.symbol] = Math.max(1, asset.baseVolume / 500);
    });
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const symbols = encodeURIComponent(this.subscribedSymbols.join(','));
    this.ws = new WebSocket(`${protocol}//${window.location.host}/api/stream?symbols=${symbols}`);
    let reportedError = false;
    this.ws.onerror = () => {
      reportedError = true;
      onStatus('error', 'WebSocket connection error');
    };
    this.ws.onclose = () => {
      if (!reportedError) onStatus('closed', 'Finnhub WebSocket closed');
    };
    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as FinnhubMessage;
        if (msg.type === 'status' && msg.state) {
          if (msg.state === 'error') reportedError = true;
          onStatus(msg.state, msg.message ?? 'Finnhub WebSocket status updated');
          return;
        }
        if (msg.type === 'ping') {
          return;
        }
        if (msg.type === 'error') {
          reportedError = true;
          onStatus('error', typeof msg.msg === 'string' ? msg.msg : 'Finnhub subscription error');
          return;
        }
        if (msg.type !== 'trade' || !Array.isArray(msg.data)) return;
        const now = Date.now();
        const ticks: StockTick[] = [];
        msg.data.forEach((trade) => {
          const asset = assetMap.get(trade.s);
          if (!asset || !Number.isFinite(trade.p) || trade.p <= 0) return;
          const previous = this.emaPrice[trade.s] ?? trade.p;
          this.emaPrice[trade.s] = previous * 0.7 + trade.p * 0.3;
          const tradeVolume = Number.isFinite(trade.v) && trade.v > 0 ? trade.v : 1;
          this.emaVolume[trade.s] = this.emaVolume[trade.s] * 0.7 + tradeVolume * 0.3;
          const pctChange = ((trade.p - previous) / Math.max(previous, 0.0001)) * 100;
          ticks.push({
            symbol: asset.symbol,
            displaySymbol: asset.displaySymbol,
            sector: asset.sector,
            price: trade.p,
            pctChange: this.previousCloses[trade.s]
              ? ((trade.p - this.previousCloses[trade.s]) / this.previousCloses[trade.s]) * 100
              : pctChange,
            previousClose: this.previousCloses[trade.s],
            volumeRatio: tradeVolume / Math.max(this.emaVolume[trade.s], 1),
            timestamp: trade.t || now,
            source: 'FINNHUB_WS',
            volume: Number.isFinite(trade.v) && trade.v > 0 ? trade.v : 0,
          });
        });
        if (ticks.length) onTrades(ticks);
      } catch {
        reportedError = true;
        onStatus('error', 'Malformed Finnhub WebSocket payload');
      }
    };
  }

  applyQuoteBaselines(baselines: Record<string, number>, previousCloses: Record<string, number> = {}) {
    Object.entries(baselines).forEach(([symbol, price]) => {
      if (Number.isFinite(price) && price > 0) this.emaPrice[symbol] = price;
    });
    Object.entries(previousCloses).forEach(([symbol, price]) => {
      if (Number.isFinite(price) && price > 0) this.previousCloses[symbol] = price;
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
