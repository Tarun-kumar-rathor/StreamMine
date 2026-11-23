import { MarketMode, ShockType, StockAsset } from '../types/marketMining';

export const SIM_UNIVERSE: StockAsset[] = [
  { symbol: 'AAPL', displaySymbol: 'AAPL', name: 'Apple Inc.', sector: 'US_TECH', basePrice: 228.4, baseVolume: 48000 },
  { symbol: 'MSFT', displaySymbol: 'MSFT', name: 'Microsoft Corp.', sector: 'US_TECH', basePrice: 424.1, baseVolume: 36000 },
  { symbol: 'NVDA', displaySymbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'US_TECH', basePrice: 138.6, baseVolume: 64000 },
  { symbol: 'INFY', displaySymbol: 'INFY', name: 'Infosys Ltd.', sector: 'IN_IT', basePrice: 22.8, baseVolume: 29000 },
  { symbol: 'TCS', displaySymbol: 'TCS', name: 'Tata Consultancy', sector: 'IN_IT', basePrice: 4180, baseVolume: 21000 },
  { symbol: 'RELIANCE', displaySymbol: 'RELIANCE', name: 'Reliance Ind.', sector: 'ENERGY', basePrice: 2740, baseVolume: 33000 },
  { symbol: 'XOM', displaySymbol: 'XOM', name: 'Exxon Mobil', sector: 'ENERGY', basePrice: 118.9, baseVolume: 27000 },
  { symbol: 'HDFCBANK', displaySymbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'BANKING', basePrice: 1715, baseVolume: 31000 },
  { symbol: 'JPM', displaySymbol: 'JPM', name: 'JPMorgan Chase', sector: 'BANKING', basePrice: 236.5, baseVolume: 26000 },
];
export const US_UNIVERSE: StockAsset[] = [
  { symbol: 'AAPL', displaySymbol: 'AAPL', name: 'Apple Inc.', sector: 'US_TECH', basePrice: 228.4, baseVolume: 50000 },
  { symbol: 'MSFT', displaySymbol: 'MSFT', name: 'Microsoft', sector: 'US_TECH', basePrice: 424.1, baseVolume: 35000 },
  { symbol: 'NVDA', displaySymbol: 'NVDA', name: 'NVIDIA', sector: 'US_TECH', basePrice: 138.6, baseVolume: 65000 },
  { symbol: 'AMD', displaySymbol: 'AMD', name: 'AMD Inc.', sector: 'US_TECH', basePrice: 152.2, baseVolume: 42000 },
  { symbol: 'META', displaySymbol: 'META', name: 'Meta Platforms', sector: 'US_TECH', basePrice: 584, baseVolume: 28000 },
  { symbol: 'INFY', displaySymbol: 'INFY', name: 'Infosys ADR', sector: 'IN_IT', basePrice: 22.8, baseVolume: 18000 },
  { symbol: 'HDB', displaySymbol: 'HDB', name: 'HDFC Bank ADR', sector: 'BANKING', basePrice: 64.5, baseVolume: 16000 },
  { symbol: 'JPM', displaySymbol: 'JPM', name: 'JPMorgan Chase', sector: 'BANKING', basePrice: 236.5, baseVolume: 25000 },
  { symbol: 'XOM', displaySymbol: 'XOM', name: 'Exxon Mobil', sector: 'ENERGY', basePrice: 118.9, baseVolume: 24000 },
];
export const CRYPTO_UNIVERSE: StockAsset[] = [
  { symbol: 'BINANCE:BTCUSDT', displaySymbol: 'BTC', name: 'Bitcoin', sector: 'CRYPTO', basePrice: 91200, baseVolume: 42 },
  { symbol: 'BINANCE:ETHUSDT', displaySymbol: 'ETH', name: 'Ethereum', sector: 'CRYPTO', basePrice: 3180, baseVolume: 260 },
  { symbol: 'BINANCE:SOLUSDT', displaySymbol: 'SOL', name: 'Solana', sector: 'CRYPTO', basePrice: 214, baseVolume: 1400 },
  { symbol: 'BINANCE:BNBUSDT', displaySymbol: 'BNB', name: 'BNB', sector: 'CRYPTO', basePrice: 650, baseVolume: 840 },
  { symbol: 'BINANCE:XRPUSDT', displaySymbol: 'XRP', name: 'Ripple', sector: 'CRYPTO', basePrice: 2.15, baseVolume: 3200 },
];

export function getUniverseForMode(mode: MarketMode): StockAsset[] {
  if (mode === 'finnhub_us') return US_UNIVERSE;
  if (mode === 'finnhub_crypto') return CRYPTO_UNIVERSE;
  return SIM_UNIVERSE;
}

export const SHOCK_LABELS: Record<ShockType, string> = {
  NONE: 'No Shock',
  TECH_RALLY: 'Tech Rally',
  OIL_SPIKE: 'Oil Spike',
  BANKING_SELLOFF: 'Banking Selloff',
};
