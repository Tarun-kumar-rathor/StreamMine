import { StockAsset, StockTick } from '../types/marketMining';

interface FinnhubTradeMsg {
  type: string;
  data?: Array<{ s: string; p: number; v: number; t: number }>;
}

export async function fetchQuoteBaselines(
  apiKey: string,
  assets: StockAsset[]
): Promise<{ baselines: Record<string, number>; previousCloses: Record<string, number> }> {
  const baselines: Record<string, number> = {};
  const previousCloses: Record<string, number> = {};
  await Promise.all(assets.slice(0, 6).map(async (asset) => {
    try {
      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(asset.symbol)}&token=${encodeURIComponent(apiKey)}`);
      if (!res.ok) return;
      const json = await res.json();
      if (typeof json.c === 'number' && json.c > 0) baselines[asset.symbol] = json.c;
      if (typeof json.pc === 'number' && json.pc > 0) previousCloses[asset.symbol] = json.pc;
    } catch { /* fallback to asset baseline */ }
  }));
  return { baselines, previousCloses };
}

export class FinnhubStreamClient {
  private ws: WebSocket | null = null;
  private emaPrice: Record<string, number> = {};
  private emaVolume: Record<string, number> = {};
  private subscribedSymbols: string[] = [];
  private previousCloses: Record<string, number> = {};

  connect(apiKey: string, assets: StockAsset[], onTrades: (ticks: StockTick[]) => void, onStatus: (state: 'connected' | 'error' | 'closed', message: string) => void) {
    this.disconnect();
    this.subscribedSymbols = assets.map((asset) => asset.symbol);
    const assetMap = new Map(assets.map((asset) => [asset.symbol, asset]));
    assets.forEach((asset) => {
      this.emaPrice[asset.symbol] = asset.basePrice;
      this.emaVolume[asset.symbol] = Math.max(1, asset.baseVolume / 500);
    });
    this.ws = new WebSocket(`wss://ws.finnhub.io?token=${encodeURIComponent(apiKey)}`);
    this.ws.onopen = () => {
      onStatus('connected', 'Finnhub WebSocket connected');
      this.subscribedSymbols.forEach((symbol) => {
        this.ws?.send(JSON.stringify({ type: 'subscribe', symbol }));
      });
    };
    this.ws.onerror = () => onStatus('error', 'WebSocket connection error');
    this.ws.onclose = () => onStatus('closed', 'Finnhub WebSocket closed');
    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'ping') {
          this.ws?.send(JSON.stringify({ type: 'pong' }));
          return;
        }
        if (msg.type === 'error') {
          onStatus('error', typeof msg.msg === 'string' ? msg.msg : 'Finnhub subscription error');
          return;
        }
        if (msg.type !== 'trade' || !msg.data) return;
        const now = Date.now();
        const ticks: StockTick[] = [];
        msg.data.forEach((trade: { s: string; p: number; v: number; t: number }) => {
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
          });
        });
        if (ticks.length) onTrades(ticks);
      } catch {
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

  subscribe(symbols: string[]) {
    if (this.ws?.readyState === WebSocket.OPEN) symbols.forEach((symbol) => this.ws?.send(JSON.stringify({ type: 'subscribe', symbol })));
  }
}
