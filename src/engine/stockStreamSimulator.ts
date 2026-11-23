import { SIM_UNIVERSE } from '../data/stockUniverse';
import { DiscretizerConfig, ShockType, StockAsset, StockTick, TransactionBasket } from '../types/marketMining';
import { buildBasketFromTicks } from './discretizer';

export function generateNextTickBatch(
  currentPrices: Record<string, number>,
  shock: ShockType,
  universe: StockAsset[] = SIM_UNIVERSE
): { ticks: StockTick[]; nextPrices: Record<string, number> } {
  const sectorSignals: Record<StockAsset['sector'], number> = {
    US_TECH: (Math.random() - 0.45) * 1.9,
    IN_IT: (Math.random() - 0.46) * 1.7,
    ENERGY: (Math.random() - 0.5) * 1.6,
    BANKING: (Math.random() - 0.5) * 1.6,
    CRYPTO: (Math.random() - 0.48) * 2.2,
  };
  if (shock === 'TECH_RALLY') {
    sectorSignals.US_TECH = 1.45 + Math.random() * 1.2;
    sectorSignals.IN_IT = 1.05 + Math.random() * 0.9;
  } else if (shock === 'OIL_SPIKE') {
    sectorSignals.ENERGY = 1.6 + Math.random() * 1.1;
    sectorSignals.IN_IT = -1.1 - Math.random() * 0.7;
  } else if (shock === 'BANKING_SELLOFF') {
    sectorSignals.BANKING = -1.55 - Math.random() * 1.0;
    sectorSignals.US_TECH = -0.6 - Math.random() * 0.7;
  }

  const nextPrices = { ...currentPrices };
  const now = Date.now();
  const ticks = universe.map((asset) => {
    const prev = nextPrices[asset.symbol] ?? asset.basePrice;
    const idiosyncratic = (Math.random() - 0.5) * 0.95;
    const pctChange = sectorSignals[asset.sector] * 0.78 + idiosyncratic;
    const nextPrice = Math.max(0.01, prev * (1 + pctChange / 100));
    nextPrices[asset.symbol] = nextPrice;
    const shockVolBoost =
      (shock === 'TECH_RALLY' && asset.sector === 'US_TECH') ||
      (shock === 'OIL_SPIKE' && asset.sector === 'ENERGY') ||
      (shock === 'BANKING_SELLOFF' && asset.sector === 'BANKING') ? 1.1 : 0;
    const volumeRatio = Number((0.85 + Math.abs(pctChange) * 0.65 + Math.random() * 0.75 + shockVolBoost).toFixed(2));
    return {
      symbol: asset.symbol,
      displaySymbol: asset.displaySymbol,
      sector: asset.sector,
      price: nextPrice,
      pctChange,
      volumeRatio,
      timestamp: now,
      source: 'SIM' as const,
    };
  });
  return { ticks, nextPrices };
}

export function generateSeedHistory(config: DiscretizerConfig, count = 36) {
  let prices: Record<string, number> = {};
  SIM_UNIVERSE.forEach((asset) => { prices[asset.symbol] = asset.basePrice; });
  const allTickBatches: StockTick[][] = [];
  for (let i = 0; i < count; i++) {
    const batch = generateNextTickBatch(prices, 'NONE').ticks;
    allTickBatches.push(batch);
    batch.forEach((tick) => { prices[tick.symbol] = tick.price; });
  }
  const latestTicks = allTickBatches[allTickBatches.length - 1] ?? [];
  return { prices, latestTicks, allTickBatches };
}
