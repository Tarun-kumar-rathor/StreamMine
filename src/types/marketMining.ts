export type MarketMode = 'finnhub_crypto' | 'finnhub_us';
export type AlgorithmType = 'FP-Growth' | 'Apriori';
export type KafkaTopic = 'stock-ticks-raw' | 'discretized-events' | 'mined-rules';
export type StabilityLevel = 'Stable' | 'Emerging' | 'Volatile';

export interface StockAsset {
  symbol: string;
  displaySymbol: string;
  name: string;
  sector: 'US_TECH' | 'IN_IT' | 'ENERGY' | 'BANKING' | 'CRYPTO';
  basePrice: number;
  baseVolume: number;
  sharesOutstanding?: number; // In billions of shares/units for realistic Market Cap
}
export interface StockTick {
  symbol: string;
  displaySymbol: string;
  sector: StockAsset['sector'];
  price: number;
  pctChange: number;
  volumeRatio: number;
  timestamp: number;
  source: 'FINNHUB_WS';
  volume?: number;
  previousClose?: number;
}
export interface KafkaMessage {
  id: string;
  topic: KafkaTopic;
  partition: 0 | 1 | 2;
  offset: number;
  timestamp: string;
  symbol: string;
  price: number;
  pct_change: number;
  volume_ratio: number;
  discretized_tag: string;
  source: 'FINNHUB_WS';
}
export interface TransactionBasket {
  windowId: number;
  timestamp: string;
  items: string[];
  rawTicks: number;
}
export interface AssociationRule {
  id: string;
  antecedent: string[];
  consequent: string[];
  support: number;
  confidence: number;
  lift: number;
  stability: StabilityLevel;
  sampleCount: number;
}
export interface DiscretizerConfig {
  priceThreshold: number;
  volumeMultiplier: number;
  windowSeconds: number;
}
export interface MiningConfig {
  algorithm: AlgorithmType;
  minSupport: number;
  minConfidence: number;
  minLift: number;
}
export interface FinnhubStatus {
  state: 'connected' | 'error' | 'closed';
  message: string;
}
