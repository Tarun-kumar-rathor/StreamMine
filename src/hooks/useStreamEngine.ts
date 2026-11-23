import { useEffect, useMemo, useRef, useState } from 'react';
import { getUniverseForMode } from '../data/stockUniverse';
import { mineAssociationRules, MiningResult } from '../engine/associationRuleMiner';
import { buildBasketFromTicks, discretizeTick, MAX_BASKETS } from '../engine/discretizer';
import { fetchQuoteBaselines, FinnhubStreamClient } from '../engine/finnhubService';
import { createKafkaMessage, MAX_KAFKA_LOGS } from '../engine/kafkaBrokerMock';
import { generateNextTickBatch, generateSeedHistory } from '../engine/stockStreamSimulator';
import {
  DiscretizerConfig, FinnhubStatus, KafkaMessage, MarketMode,
  MiningConfig, ShockType, StockTick, TransactionBasket,
} from '../types/marketMining';

export function useStreamEngine() {
  const [mode, setMode] = useState<MarketMode>('simulator');
  const [isRunning, setIsRunning] = useState(true);
  const [speed, setSpeed] = useState<1 | 2 | 5>(1);
  const [shock, setShock] = useState<ShockType>('NONE');
  const [shockPulseKey, setShockPulseKey] = useState(0);
  const [discretizerConfig, setDiscretizerConfig] = useState<DiscretizerConfig>({
    priceThreshold: 0.75, volumeMultiplier: 1.6, windowSeconds: 5,
  });
  const [miningConfig, setMiningConfig] = useState<MiningConfig>({
    algorithm: 'FP-Growth', minSupport: 0.14, minConfidence: 0.55, minLift: 1.15,
  });
  const initialSeed = useMemo(() => generateSeedHistory(discretizerConfig, 36), []);
  const [prices, setPrices] = useState<Record<string, number>>(initialSeed.prices);
  const [latestTicks, setLatestTicks] = useState<StockTick[]>(initialSeed.latestTicks);
  const [rawTickHistory, setRawTickHistory] = useState<StockTick[][]>(initialSeed.allTickBatches);
  const seedKafkaLogs = useMemo(() => initialSeed.allTickBatches.flatMap((batch, batchIndex) =>
    batch.flatMap((tick, tickIndex) => discretizeTick(tick, discretizerConfig).map((tag) =>
      createKafkaMessage(tick, 'stock-ticks-raw', batchIndex * 100 + tickIndex, tag)
    ))
  ).slice(-MAX_KAFKA_LOGS), [initialSeed, discretizerConfig]);
  const seedBaskets = useMemo(() => initialSeed.allTickBatches.map((batch, index) =>
    buildBasketFromTicks(index + 1, batch, discretizerConfig)
  ).slice(-MAX_BASKETS), [initialSeed, discretizerConfig]);
  const [kafkaLogs, setKafkaLogs] = useState<KafkaMessage[]>(seedKafkaLogs);
  const [baskets, setBaskets] = useState<TransactionBasket[]>(seedBaskets);
  const [miningResult, setMiningResult] = useState<MiningResult>({ rules: [], runtimeMs: 0, frequentItemsetsCount: 0 });
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('streammine_finnhub_key') ?? '');
  const [finnhubStatus, setFinnhubStatus] = useState<FinnhubStatus>({ state: 'closed', message: 'Disconnected' });
  const finnhubRef = useRef<FinnhubStreamClient | null>(null);
  const eventOffset = useRef(0);
  const windowId = useRef(0);
  const openWindowTicks = useMemo(() => rawTickHistory.flatMap((batch) => batch).slice(-200), [rawTickHistory]);

  useEffect(() => {
    if (mode === 'simulator' || !apiKey) {
      finnhubRef.current?.disconnect();
      finnhubRef.current = null;
      return;
    }
    const universe = getUniverseForMode(mode);
    const client = new FinnhubStreamClient();
    finnhubRef.current = client;
    client.connect(apiKey, universe, (ticks) => {
      setLatestTicks((current) => {
        const latestBySymbol = new Map(current.map((tick) => [tick.symbol, tick]));
        ticks.forEach((tick) => latestBySymbol.set(tick.symbol, tick));
        return universe
          .map((asset) => latestBySymbol.get(asset.symbol))
          .filter((tick): tick is StockTick => Boolean(tick));
      });
      setRawTickHistory((history) => [...history, ticks].slice(-100));
      setPrices((current) => {
        const next = { ...current };
        ticks.forEach((tick) => { next[tick.symbol] = tick.price; });
        return next;
      });
    }, (state, message) => setFinnhubStatus({ state, message }));
    fetchQuoteBaselines(apiKey, universe).then(({ baselines, previousCloses }) => {
      client.applyQuoteBaselines(baselines, previousCloses);
      setPrices((current) => ({ ...current, ...baselines }));
      setLatestTicks((current) => {
        const latestBySymbol = new Map(current.map((tick) => [tick.symbol, tick]));
        universe.forEach((asset) => {
          const baseline = baselines[asset.symbol];
          if (!baseline) return;
          const existing = latestBySymbol.get(asset.symbol);
          latestBySymbol.set(asset.symbol, {
            symbol: asset.symbol,
            displaySymbol: asset.displaySymbol,
            sector: asset.sector,
            price: baseline,
            pctChange: previousCloses[asset.symbol]
              ? ((baseline - previousCloses[asset.symbol]) / previousCloses[asset.symbol]) * 100
              : existing?.pctChange ?? 0,
            previousClose: previousCloses[asset.symbol],
            volumeRatio: existing?.volumeRatio ?? 1,
            timestamp: Date.now(),
            source: 'FINNHUB_WS',
          });
        });
        return universe
          .map((asset) => latestBySymbol.get(asset.symbol))
          .filter((tick): tick is StockTick => Boolean(tick));
      });
    });
    return () => client.disconnect();
  }, [mode, apiKey]);

  useEffect(() => {
    if (!isRunning || mode !== 'simulator') return;
    const interval = window.setInterval(() => {
      const universe = getUniverseForMode(mode);
      setPrices((current) => {
        const generated = generateNextTickBatch(current, shock, universe);
        setLatestTicks(generated.ticks);
        setRawTickHistory((history) => [...history, generated.ticks].slice(-100));
        return generated.nextPrices;
      });
    }, 250 / speed);
    return () => window.clearInterval(interval);
  }, [isRunning, speed, shock, mode]);

  useEffect(() => {
    if (!latestTicks.length) return;
    const newLogs: KafkaMessage[] = [];
    latestTicks.forEach((tick) => {
      discretizeTick(tick, discretizerConfig).forEach((tag) => {
        newLogs.push(createKafkaMessage(tick, 'stock-ticks-raw', eventOffset.current++, tag));
      });
    });
    setKafkaLogs((logs) => [...newLogs, ...logs].slice(0, MAX_KAFKA_LOGS));
  }, [latestTicks, discretizerConfig]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      windowId.current++;
      const basket = buildBasketFromTicks(windowId.current, openWindowTicks, discretizerConfig);
      setBaskets((current) => [...current, basket].slice(-MAX_BASKETS));
    }, discretizerConfig.windowSeconds * 1000);
    return () => window.clearInterval(interval);
  }, [discretizerConfig.windowSeconds, openWindowTicks]);

  useEffect(() => {
    setMiningResult(mineAssociationRules(baskets, miningConfig));
  }, [baskets, miningConfig]);

  const triggerShock = (nextShock: ShockType) => {
    setShock(nextShock);
    setShockPulseKey((key) => key + 1);
  };

  const clearLogs = () => setKafkaLogs([]);

  return {
    mode, setMode, isRunning, setIsRunning, speed, setSpeed, shock, triggerShock,
    shockPulseKey, discretizerConfig, setDiscretizerConfig, miningConfig, setMiningConfig,
    prices, latestTicks, kafkaLogs, baskets, openWindowTicks, miningResult,
    apiKey, setApiKey, finnhubStatus, clearLogs,
  };
}
