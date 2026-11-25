import { useEffect, useRef, useState, useCallback } from 'react';
import { getUniverseForMode } from '../data/stockUniverse';
import { mineAssociationRules, MiningResult } from '../engine/associationRuleMiner';
import { buildBasketFromTicks, discretizeTick, MAX_BASKETS } from '../engine/discretizer';
import { fetchQuoteBaselines, FinnhubStreamClient } from '../engine/finnhubService';
import { createKafkaMessage, MAX_KAFKA_LOGS } from '../engine/kafkaBrokerMock';
import {
  DiscretizerConfig, FinnhubStatus, KafkaMessage, MarketMode,
  MiningConfig, StockTick, TransactionBasket,
} from '../types/marketMining';
import type { MiningWorkerResult } from '../workers/mining.worker';

export function useStreamEngine() {
  const [mode, setMode] = useState<MarketMode>('finnhub_us');
  const [discretizerConfig, setDiscretizerConfig] = useState<DiscretizerConfig>({
    priceThreshold: 0.75, volumeMultiplier: 1.6, windowSeconds: 5,
  });
  const [miningConfig, setMiningConfig] = useState<MiningConfig>({
    algorithm: 'FP-Growth', minSupport: 0.14, minConfidence: 0.55, minLift: 1.15,
  });
  const [latestTicks, setLatestTicks] = useState<StockTick[]>([]);
  const [openWindowTicks, setOpenWindowTicks] = useState<StockTick[]>([]);
  const openWindowTicksRef = useRef<StockTick[]>([]);
  const discretizerConfigRef = useRef(discretizerConfig);
  discretizerConfigRef.current = discretizerConfig;
  const [kafkaLogs, setKafkaLogs] = useState<KafkaMessage[]>([]);
  const [baskets, setBaskets] = useState<TransactionBasket[]>([]);
  const [miningResult, setMiningResult] = useState<MiningResult & { fpGrowthRuntimeMs?: number; aprioriRuntimeMs?: number }>({
    rules: [], runtimeMs: 0, frequentItemsetsCount: 0, fpGrowthRuntimeMs: 0, aprioriRuntimeMs: 0,
  });
  const [leadLagEnabled, setLeadLagEnabled] = useState(false);
  const [injectedNews, setInjectedNews] = useState<string[]>([]);
  const workerRef = useRef<Worker | null>(null);
  const [finnhubStatus, setFinnhubStatus] = useState<FinnhubStatus>({ state: 'closed', message: 'Disconnected' });
  const eventOffset = useRef(0);
  const windowId = useRef(0);

  // Initialize Web Worker for Rule Mining
  useEffect(() => {
    try {
      const worker = new Worker(new URL('../workers/mining.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e: MessageEvent<MiningWorkerResult>) => {
        setMiningResult(e.data);
      };
      workerRef.current = worker;
      return () => worker.terminate();
    } catch {
      workerRef.current = null;
    }
  }, []);

  useEffect(() => {
    localStorage.removeItem('streammine_finnhub_key');
  }, []);

  useEffect(() => {
    const universe = getUniverseForMode(mode);
    const client = new FinnhubStreamClient();
    let active = true;
    client.connect(universe, (ticks) => {
      if (!active) return;
      setLatestTicks((current) => {
        const latestBySymbol = new Map(current.map((tick) => [tick.symbol, tick]));
        ticks.forEach((tick) => latestBySymbol.set(tick.symbol, tick));
        return universe
          .map((asset) => latestBySymbol.get(asset.symbol))
          .filter((tick): tick is StockTick => Boolean(tick));
      });
    }, (state, message) => {
      if (active) setFinnhubStatus({ state, message });
    });
    fetchQuoteBaselines(universe)
      .then(({ baselines, previousCloses }) => {
        if (!active) return;
        client.applyQuoteBaselines(baselines, previousCloses);
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
      })
      .catch((error: unknown) => {
        if (!active) return;
        setFinnhubStatus({
          state: 'error',
          message: error instanceof Error ? `Finnhub quote GET failed: ${error.message}` : 'Finnhub quote GET failed',
        });
      });
    return () => {
      active = false;
      client.disconnect();
    };
  }, [mode]);

  useEffect(() => {
    if (!latestTicks.length) return;
    openWindowTicksRef.current = [...openWindowTicksRef.current, ...latestTicks];
    setOpenWindowTicks(openWindowTicksRef.current);
  }, [latestTicks]);

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
      const ticks = openWindowTicksRef.current;
      if (!ticks.length && !injectedNews.length) return;
      openWindowTicksRef.current = [];
      setOpenWindowTicks([]);
      windowId.current++;
      const basket = buildBasketFromTicks(windowId.current, ticks, discretizerConfigRef.current);
      if (injectedNews.length > 0) {
        basket.items = [...new Set([...basket.items, ...injectedNews])];
        setInjectedNews([]);
      }
      setBaskets((current) => [...current, basket].slice(-MAX_BASKETS));
    }, discretizerConfig.windowSeconds * 1000);
    return () => window.clearInterval(interval);
  }, [discretizerConfig.windowSeconds, injectedNews]);

  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        baskets,
        config: miningConfig,
        leadLagEnabled,
      });
    } else {
      setMiningResult(mineAssociationRules(baskets, miningConfig));
    }
  }, [baskets, miningConfig, leadLagEnabled]);

  const injectNewsTag = useCallback((tag: string) => {
    setInjectedNews((prev) => [...prev, tag]);
  }, []);

  const replayShockTicks = useCallback((ticks: StockTick[]) => {
    setLatestTicks(ticks);
  }, []);

  const clearLogs = () => setKafkaLogs([]);

  return {
    mode, setMode, discretizerConfig, setDiscretizerConfig, miningConfig, setMiningConfig,
    latestTicks, kafkaLogs, baskets, openWindowTicks, miningResult,
    finnhubStatus, clearLogs,
    leadLagEnabled, setLeadLagEnabled,
    injectNewsTag, injectedNews,
    replayShockTicks,
  };
}
