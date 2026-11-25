import { MarketMode, StockAsset } from '../types/marketMining';

export const US_UNIVERSE: StockAsset[] = [
  { symbol: 'AAPL', displaySymbol: 'AAPL', name: 'Apple Inc.', sector: 'US_TECH', basePrice: 228.4, baseVolume: 50000, sharesOutstanding: 15.11 },
  { symbol: 'MSFT', displaySymbol: 'MSFT', name: 'Microsoft', sector: 'US_TECH', basePrice: 424.1, baseVolume: 35000, sharesOutstanding: 7.43 },
  { symbol: 'NVDA', displaySymbol: 'NVDA', name: 'NVIDIA', sector: 'US_TECH', basePrice: 138.6, baseVolume: 65000, sharesOutstanding: 24.54 },
  { symbol: 'AMD', displaySymbol: 'AMD', name: 'AMD Inc.', sector: 'US_TECH', basePrice: 152.2, baseVolume: 42000, sharesOutstanding: 1.62 },
  { symbol: 'META', displaySymbol: 'META', name: 'Meta Platforms', sector: 'US_TECH', basePrice: 584, baseVolume: 28000, sharesOutstanding: 2.53 },
  { symbol: 'INFY', displaySymbol: 'INFY', name: 'Infosys ADR', sector: 'IN_IT', basePrice: 22.8, baseVolume: 18000, sharesOutstanding: 4.15 },
  { symbol: 'HDB', displaySymbol: 'HDB', name: 'HDFC Bank ADR', sector: 'BANKING', basePrice: 64.5, baseVolume: 16000, sharesOutstanding: 7.62 },
  { symbol: 'JPM', displaySymbol: 'JPM', name: 'JPMorgan Chase', sector: 'BANKING', basePrice: 236.5, baseVolume: 25000, sharesOutstanding: 2.85 },
  { symbol: 'XOM', displaySymbol: 'XOM', name: 'Exxon Mobil', sector: 'ENERGY', basePrice: 118.9, baseVolume: 24000, sharesOutstanding: 3.97 },
];
export const CRYPTO_UNIVERSE: StockAsset[] = [
  { symbol: 'BINANCE:BTCUSDT', displaySymbol: 'BTC', name: 'Bitcoin', sector: 'CRYPTO', basePrice: 91200, baseVolume: 42, sharesOutstanding: 0.0197 },
  { symbol: 'BINANCE:ETHUSDT', displaySymbol: 'ETH', name: 'Ethereum', sector: 'CRYPTO', basePrice: 3180, baseVolume: 260, sharesOutstanding: 0.1204 },
  { symbol: 'BINANCE:SOLUSDT', displaySymbol: 'SOL', name: 'Solana', sector: 'CRYPTO', basePrice: 214, baseVolume: 1400, sharesOutstanding: 0.468 },
  { symbol: 'BINANCE:BNBUSDT', displaySymbol: 'BNB', name: 'BNB', sector: 'CRYPTO', basePrice: 650, baseVolume: 840, sharesOutstanding: 0.147 },
  { symbol: 'BINANCE:XRPUSDT', displaySymbol: 'XRP', name: 'Ripple', sector: 'CRYPTO', basePrice: 2.15, baseVolume: 3200, sharesOutstanding: 56.8 },
];

export function getUniverseForMode(mode: MarketMode): StockAsset[] {
  return mode === 'finnhub_crypto' ? CRYPTO_UNIVERSE : US_UNIVERSE;
}
