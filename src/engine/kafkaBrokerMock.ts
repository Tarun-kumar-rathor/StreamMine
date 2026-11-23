import { KafkaMessage, KafkaTopic, StockTick } from '../types/marketMining';

export const MAX_KAFKA_LOGS = 200;

export function hashPartition(key: string): 0 | 1 | 2 {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) % 997;
  return (hash % 3) as 0 | 1 | 2;
}

export function createKafkaMessage(tick: StockTick, topic: KafkaTopic, offset: number, tag: string): KafkaMessage {
  return {
    id: `${topic}-${offset}-${tick.displaySymbol}-${Math.random().toString(36).slice(2, 6)}`,
    topic,
    partition: hashPartition(tick.displaySymbol),
    offset,
    timestamp: new Date(tick.timestamp).toLocaleTimeString('en-US', { hour12: false }),
    symbol: tick.displaySymbol,
    price: Number(tick.price.toFixed(tick.price < 10 ? 4 : 2)),
    pct_change: Number(tick.pctChange.toFixed(3)),
    volume_ratio: Number(tick.volumeRatio.toFixed(2)),
    discretized_tag: tag,
    source: tick.source,
  };
}
