import { DiscretizerConfig, StockTick, TransactionBasket } from '../types/marketMining';

export const MAX_BASKETS = 100;

export function discretizeTick(tick: StockTick, config: DiscretizerConfig): string[] {
  const tags: string[] = [];
  if (tick.pctChange >= config.priceThreshold) tags.push(`${tick.displaySymbol}_UP`);
  else if (tick.pctChange <= -config.priceThreshold) tags.push(`${tick.displaySymbol}_DOWN`);
  if (tick.volumeRatio >= config.volumeMultiplier) tags.push(`${tick.displaySymbol}_HighVol`);
  return tags;
}

export function buildBasketFromTicks(windowId: number, ticks: StockTick[], config: DiscretizerConfig): TransactionBasket {
  const uniqueItems = new Set<string>();
  ticks.forEach((tick) => discretizeTick(tick, config).forEach((item) => uniqueItems.add(item)));
  return {
    windowId,
    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
    items: Array.from(uniqueItems).sort(),
    rawTicks: ticks.length,
  };
}
