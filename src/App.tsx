import React, { useEffect, useMemo, useState } from 'react';
import Lenis from 'lenis';
import {
  Activity,
  CircleHelp,
  Database,
  Flame,
  Heart,
  Mail,
  Pause,
  Play,
  Radio,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { SHOCK_LABELS } from './data/stockUniverse';
import { useStreamEngine } from './hooks/useStreamEngine';
import { ShockType } from './types/marketMining';
import { Navbar } from './components/layout/Navbar';
import { KpiMetricCards } from './components/pipeline/KpiMetricCards';
import { KafkaPipelineFlow } from './components/pipeline/KafkaPipelineFlow';
import { PartitionChart } from './components/kafka/PartitionChart';
import { LiveMessageFeed } from './components/kafka/LiveMessageFeed';
import { FinnhubModal } from './components/kafka/FinnhubModal';
import { DiscretizerLab } from './components/mining/DiscretizerLab';
import { RuleExplorer } from './components/mining/RuleExplorer';
import { Card } from './components/ui/Primitives';

type TerminalTab = 'home' | 'overview' | 'kafka' | 'discretizer' | 'rules' | 'operations';
type WorkspaceLayer = 'home' | 'terminal' | 'stock';
type CurrencyCode = 'USD' | 'INR' | 'EUR' | 'GBP';

const CURRENCIES: Record<CurrencyCode, { symbol: string; rate: number; label: string }> = {
  USD: { symbol: '$', rate: 1, label: 'US Dollar' },
  INR: { symbol: '₹', rate: 83.5, label: 'Indian Rupee' },
  EUR: { symbol: '€', rate: 0.92, label: 'Euro' },
  GBP: { symbol: '£', rate: 0.79, label: 'British Pound' },
};

export default function App() {
  const engine = useStreamEngine();
  const [activeTab, setActiveTab] = useState<TerminalTab>('home');
  const [kafkaSubTab, setKafkaSubTab] = useState<'feed' | 'partitions' | 'topics'>('feed');
  const [discretizerSubTab, setDiscretizerSubTab] = useState<'parameters' | 'baskets' | 'ticks'>('parameters');
  const [rulesSubTab, setRulesSubTab] = useState<'graph' | 'rules' | 'engine'>('graph');
  const [operationsSubTab, setOperationsSubTab] = useState<'shocks' | 'speed' | 'session'>('shocks');
  const [finnhubOpen, setFinnhubOpen] = useState(false);
  const [marketStarted, setMarketStarted] = useState(false);
  const [stockSearch, setStockSearch] = useState('');
  const [selectedStock, setSelectedStock] = useState('');
  const [detailStock, setDetailStock] = useState<typeof engine.latestTicks[number] | null>(null);
  const [stockHistory, setStockHistory] = useState<Record<string, number[]>>({});
  const [workspaceLayer, setWorkspaceLayer] = useState<WorkspaceLayer>('home');
  const [showPipelineInfo, setShowPipelineInfo] = useState(false);
  const [chartRange, setChartRange] = useState<'1H' | '1D' | '1W' | '1M'>('1D');
  const [marketCapHistory, setMarketCapHistory] = useState<number[]>([]);
  const [marketCapUpdatedAt, setMarketCapUpdatedAt] = useState(new Date());
  const [marketCapRange, setMarketCapRange] = useState<'1H' | '1D' | '1W' | '1M'>('1M');
  const [currency, setCurrency] = useState<CurrencyCode>(() =>
    (localStorage.getItem('streammine_currency') as CurrencyCode) || 'USD'
  );

  const convertPrice = (price: number) => price * CURRENCIES[currency].rate;
  const formatPrice = (price: number) => {
    const converted = convertPrice(price);
    return `${CURRENCIES[currency].symbol}${converted.toFixed(converted < 10 ? 4 : 2)}`;
  };
  const formatMarketCap = (value: number) => {
    const converted = value * CURRENCIES[currency].rate;
    if (converted >= 1_000_000_000_000) return `${CURRENCIES[currency].symbol}${(converted / 1_000_000_000_000).toFixed(2)}T`;
    if (converted >= 1_000_000_000) return `${CURRENCIES[currency].symbol}${(converted / 1_000_000_000).toFixed(2)}B`;
    return `${CURRENCIES[currency].symbol}${(converted / 1_000_000).toFixed(2)}M`;
  };

  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.08, duration: 1.2, smoothWheel: true });
    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    if (!engine.latestTicks.length) return;
    if (!selectedStock) setSelectedStock(engine.latestTicks[0].displaySymbol);
    if (workspaceLayer === 'stock' && detailStock) {
      const liveSelected = engine.latestTicks.find((tick) => tick.displaySymbol === detailStock.displaySymbol);
      if (liveSelected) setDetailStock(liveSelected);
    }
    setStockHistory((history) => {
      const next = { ...history };
      engine.latestTicks.forEach((tick) => {
        const values = next[tick.displaySymbol] ?? [];
        next[tick.displaySymbol] = [...values, tick.price].slice(-40);
      });
      return next;
    });
  }, [engine.latestTicks, selectedStock]);

  useEffect(() => {
    if (!engine.latestTicks.length) return;
    const updateMarketCap = () => {
      const sectorWeights: Record<string, number> = {
        US_TECH: 1_600_000_000,
        IN_IT: 280_000_000,
        ENERGY: 1_100_000_000,
        BANKING: 780_000_000,
        CRYPTO: 20_000_000,
      };
      const trackedMarketCap = engine.latestTicks.reduce(
        (total, tick) => total + tick.price * (sectorWeights[tick.sector] ?? 500_000_000) * tick.volumeRatio,
        0
      );
      setMarketCapHistory((history) => [...history, trackedMarketCap].slice(-90));
      setMarketCapUpdatedAt(new Date());
    };
    updateMarketCap();
    const interval = window.setInterval(updateMarketCap, 1000);
    return () => window.clearInterval(interval);
  }, [engine.latestTicks]);

  const strongRulesCount = engine.miningResult.rules.filter((rule) => rule.lift > 1.2).length;
  const displayTicks = useMemo(
    () => engine.latestTicks,
    [engine.latestTicks]
  );
  const displayKafkaLogs = useMemo(
    () => engine.kafkaLogs.map((message) => ({ ...message, price: convertPrice(message.price) })),
    [engine.kafkaLogs, currency]
  );
  const searchedTicks = useMemo(() => {
    const query = stockSearch.trim().toLowerCase();
    if (!query) return displayTicks;
    return displayTicks.filter((tick) =>
      tick.displaySymbol.toLowerCase().includes(query) ||
      tick.symbol.toLowerCase().includes(query) ||
      tick.sector.toLowerCase().includes(query)
    );
  }, [displayTicks, stockSearch]);
  const selectedTick = workspaceLayer === 'stock'
    ? (detailStock ?? displayTicks.find((tick) => tick.displaySymbol === selectedStock) ?? displayTicks[0])
    : (displayTicks.find((tick) => tick.displaySymbol === selectedStock) ?? displayTicks[0]);
  const selectedHistory = selectedStock ? stockHistory[selectedStock] ?? [] : [];
  const convertedHistory = useMemo(
    () => selectedHistory.map((value) => convertPrice(value)),
    [selectedHistory, currency]
  );
  const twentyFourHourChange = useMemo(() => {
    if (detailStock?.previousClose && detailStock.previousClose > 0) {
      return ((detailStock.price - detailStock.previousClose) / detailStock.previousClose) * 100;
    }
    if (!convertedHistory.length) return 0;
    const reference = convertedHistory[0];
    if (!reference || reference <= 0) return 0;
    return ((convertedHistory[convertedHistory.length - 1] - reference) / reference) * 100;
  }, [convertedHistory]);
  const chartPoints = useMemo(() => {
    if (convertedHistory.length < 2) return '';
    const width = 760;
    const height = 260;
    const padding = 18;
    const min = Math.min(...convertedHistory);
    const max = Math.max(...convertedHistory);
    const range = max - min || 1;
    return convertedHistory.map((value, index) => {
      const x = padding + (index / (selectedHistory.length - 1)) * (width - padding * 2);
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');
  }, [convertedHistory, selectedHistory.length]);
  const latestMarketCap = marketCapHistory[marketCapHistory.length - 1] ?? 0;
  const previousMarketCap = marketCapHistory.length > 1 ? marketCapHistory[marketCapHistory.length - 2] : latestMarketCap;
  const marketCapChange = previousMarketCap ? ((latestMarketCap - previousMarketCap) / previousMarketCap) * 100 : 0;
  const stockRules = useMemo(() => {
    if (!selectedTick) return [];
    return engine.miningResult.rules.filter((rule) =>
      [...rule.antecedent, ...rule.consequent].some((item) =>
        item.startsWith(`${selectedTick.displaySymbol}_`) ||
        item === selectedTick.displaySymbol
      )
    ).slice(0, 10);
  }, [engine.miningResult.rules, selectedTick?.displaySymbol]);
  const stockRuleMetrics = useMemo(() => {
    if (!stockRules.length) return { avgLift: 0, avgConfidence: 0, avgSupport: 0, stable: 0 };
    return {
      avgLift: stockRules.reduce((sum, rule) => sum + rule.lift, 0) / stockRules.length,
      avgConfidence: stockRules.reduce((sum, rule) => sum + rule.confidence, 0) / stockRules.length,
      avgSupport: stockRules.reduce((sum, rule) => sum + rule.support, 0) / stockRules.length,
      stable: stockRules.filter((rule) => rule.stability === 'Stable').length,
    };
  }, [stockRules]);
  const enterDemo = () => {
    engine.setMode('simulator');
    engine.setIsRunning(true);
    setActiveTab('overview');
    setMarketStarted(true);
    setWorkspaceLayer('terminal');
  };
  const enterFinnhub = (targetMode: 'finnhub_us' | 'finnhub_crypto') => {
    setActiveTab('overview');
    setMarketStarted(true);
    engine.setMode(targetMode);
    setWorkspaceLayer('terminal');
  };
  const enterHome = () => {
    setActiveTab('home');
    setMarketStarted(false);
    setWorkspaceLayer('home');
    setDetailStock(null);
  };
  const openStockDetail = (symbol: string) => {
    setSelectedStock(symbol);
    setDetailStock(displayTicks.find((tick) => tick.displaySymbol === symbol) ?? null);
    setWorkspaceLayer('stock');
  };
  const tabs: Array<[TerminalTab, string, React.ReactNode]> = [
    ['overview', 'Live Market', <Activity key="overview" className="w-4 h-4" />],
    ['kafka', 'Kafka Stream', <Database key="kafka" className="w-4 h-4" />],
    ['discretizer', 'Discretizer', <SlidersHorizontal key="discretizer" className="w-4 h-4" />],
    ['rules', 'Rule Graph', <Sparkles key="rules" className="w-4 h-4" />],
    ['operations', 'Shock Lab', <Flame key="operations" className="w-4 h-4" />],
  ];

  return (
    <div className="min-h-screen bg-[#090D16] text-[#F9FAFB]">
      {workspaceLayer === 'stock' ? (
        <>
          <section className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
            <div className="mt-4">
              {workspaceLayer === 'stock' && selectedTick && (
                <div className="space-y-4">
                  <Card className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <button
                          onClick={() => {
                            setWorkspaceLayer('terminal');
                            setDetailStock(null);
                          }}
                          className="mb-4 text-xs font-semibold text-[#68705D] hover:text-[#6366F1]"
                        >
                          ← Back to Live Terminal
                        </button>
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#6366F1]/10 text-sm font-bold text-[#6366F1]">
                            {selectedTick.displaySymbol.slice(0, 2)}
                          </div>
                          <div>
                            <h1 className="text-2xl font-bold">{selectedTick.displaySymbol}</h1>
                            <p className="mt-1 text-xs text-[#68705D]">{selectedTick.sector} · {selectedTick.source === 'SIM' ? 'Simulated Market' : 'Finnhub Live'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold tabular-nums">{formatPrice(selectedTick.price)}</div>
                        <div className={`mt-1 text-sm font-semibold tabular-nums ${twentyFourHourChange >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                          {twentyFourHourChange >= 0 ? '+' : ''}{twentyFourHourChange.toFixed(2)}% <span className="text-[10px] text-[#68705D]">24h</span>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <div className="grid xl:grid-cols-[1.7fr_0.7fr] gap-4">
                    <Card className="p-5">
                      <div className="flex items-center justify-between">
                        <div><h2 className="text-sm font-semibold">Detailed Price Trend</h2><p className="mt-1 text-xs text-[#68705D]">Live line chart · 5-tick smoothing</p></div>
                        <span className="text-[10px] font-semibold text-[#10B981]">LIVE</span>
                      </div>
                      {selectedHistory.length > 1 ? (
                        <div>
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {(['1H', '1D', '1W', '1M'] as const).map((range) => (
                                <button
                                  key={range}
                                  onClick={() => setChartRange(range)}
                                  className={`rounded-md px-2.5 py-1 text-[10px] font-semibold ${chartRange === range ? 'bg-[#6366F1] text-white' : 'text-[#68705D] hover:bg-[#E8E4D7]'}`}
                                >
                                  {range}
                                </button>
                              ))}
                            </div>
                            <span className="text-[10px] tabular-nums text-[#68705D]">
                              {chartRange === '1H' ? '60 points' : chartRange === '1D' ? '24 points' : chartRange === '1W' ? '7 points' : '30 points'} · {chartRange}
                            </span>
                          </div>
                          <svg viewBox="0 0 760 300" className="mt-3 h-[300px] w-full" role="img" aria-label={`${selectedTick.displaySymbol} detailed price history`}>
                            {[30, 78, 126, 174, 222].map((y) => (
                              <g key={y}>
                                <line x1="58" y1={y} x2="742" y2={y} stroke="#DDD8C8" strokeWidth="1" />
                                <line x1="58" y1={y} x2="742" y2={y} stroke="#DDD8C8" strokeWidth="1" strokeDasharray="4 6" />
                              </g>
                            ))}
                            {[58, 190, 322, 454, 586, 742].map((x) => (
                              <line key={x} x1={x} y1="30" x2={x} y2="222" stroke="#DDD8C8" strokeWidth="1" strokeDasharray="4 6" />
                            ))}
                            {(() => {
                              const pointCount = chartRange === '1H' ? 60 : chartRange === '1D' ? 24 : chartRange === '1W' ? 7 : 30;
                              const rangeTrend = chartRange === '1H' ? 0.006 : chartRange === '1D' ? 0.018 : chartRange === '1W' ? 0.032 : 0.075;
                              const current = convertedHistory.length
                                ? convertedHistory[convertedHistory.length - 1]
                                : selectedTick.price;
                              const sampled = Array.from({ length: pointCount }, (_, index) => {
                                const progress = index / (pointCount - 1);
                                const seed = selectedTick.displaySymbol.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
                                const wave = Math.sin(index * 0.78 + seed) * current * rangeTrend * 0.16;
                                const shortWave = Math.cos(index * 0.31 + seed * 0.1) * current * rangeTrend * 0.07;
                                const trend = current * (1 - rangeTrend * (1 - progress));
                                return index === pointCount - 1 ? current : trend + wave + shortWave;
                              });
                              const rawMin = sampled.length ? Math.min(...sampled) : selectedTick.price;
                              const rawMax = sampled.length ? Math.max(...sampled) : selectedTick.price;
                              const padding = Math.max((rawMax - rawMin) * 0.18, selectedTick.price * 0.012);
                              const chartMin = Math.max(0, rawMin - padding);
                              const chartMax = rawMax + padding;
                              const range = chartMax - chartMin || 1;
                              const points = sampled.map((value, index) => ({
                                x: 58 + (index / Math.max(1, sampled.length - 1)) * 684,
                                y: 222 - ((value - chartMin) / range) * 192,
                              }));
                              const movingAverage = sampled.map((_, index, values) => {
                                const start = Math.max(0, index - 4);
                                const window = values.slice(start, index + 1);
                                return window.reduce((sum, value) => sum + value, 0) / window.length;
                              }).map((value, index) => ({
                                x: points[index]?.x ?? 58,
                                y: 222 - ((value - chartMin) / range) * 192,
                              }));
                              const line = points.map((point) => `${point.x},${point.y}`).join(' ');
                              const averageLine = movingAverage.map((point) => `${point.x},${point.y}`).join(' ');
                              const areaPoints = points.length
                                ? `58,222 ${line} ${points[points.length - 1]?.x ?? 742},222`
                                : '';
                              return (
                                <>
                                  <defs>
                                    <linearGradient id="stockArea" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="#6366F1" stopOpacity="0.28" />
                                      <stop offset="100%" stopColor="#6366F1" stopOpacity="0.02" />
                                    </linearGradient>
                                  </defs>
                                  {areaPoints && <polygon points={areaPoints} fill="url(#stockArea)" />}
                                  {line && <polyline points={line} fill="none" stroke="#6366F1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
                                  {averageLine && <polyline points={averageLine} fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="7 5" strokeLinecap="round" strokeLinejoin="round" />}
                                  {points.map((point, index) => index === points.length - 1 ? (
                                    <g key={index}>
                                      <line x1={point.x} y1="30" x2={point.x} y2="222" stroke="#6366F1" strokeWidth="1" strokeDasharray="3 5" opacity="0.55" />
                                      <circle cx={point.x} cy={point.y} r="8" fill="#6366F1" fillOpacity="0.14" />
                                      <circle cx={point.x} cy={point.y} r="4" fill="#10B981" stroke="#FFFDF7" strokeWidth="2" />
                                    </g>
                                  ) : null)}
                                </>
                              );
                            })()}
                            <text x="58" y="286" fill="#68705D" fontSize="9">
                              {chartRange === '1H' ? '60 min ago' : chartRange === '1D' ? '24 hours ago' : chartRange === '1W' ? '7 days ago' : '30 days ago'}
                            </text>
                            <text x="742" y="286" textAnchor="end" fill="#68705D" fontSize="9">Today · Live</text>
                            <text x="48" y="34" textAnchor="end" fill="#68705D" fontSize="9">High</text>
                            <text x="48" y="226" textAnchor="end" fill="#68705D" fontSize="9">Low</text>
                          </svg>
                          <div className="flex items-center gap-4 border-t border-[#DDD8C8] pt-3 text-[10px]">
                            <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-[#6366F1]" />Price</span>
                            <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 border-t border-dashed border-[#F59E0B]" />Moving average</span>
                            <span className="ml-auto text-[#68705D] tabular-nums">Current {formatPrice(selectedTick.price)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-5 flex h-[260px] items-center justify-center text-xs text-[#68705D]">Collecting price history...</div>
                      )}
                    </Card>

                    <Card className="p-5">
                      <h2 className="text-sm font-semibold">Stock Details</h2>
                      <div className="mt-4 divide-y divide-[#DDD8C8]">
                        <div className="flex justify-between py-3 text-xs"><span className="text-[#68705D]">Symbol</span><span className="font-semibold">{selectedTick.displaySymbol}</span></div>
                        <div className="flex justify-between py-3 text-xs"><span className="text-[#68705D]">Sector</span><span className="font-semibold">{selectedTick.sector}</span></div>
                        <div className="flex justify-between py-3 text-xs"><span className="text-[#68705D]">Volume Ratio</span><span className="font-semibold tabular-nums">{selectedTick.volumeRatio.toFixed(2)}x</span></div>
                        <div className="flex justify-between py-3 text-xs"><span className="text-[#68705D]">Data Source</span><span className="font-semibold">{selectedTick.source === 'SIM' ? 'Simulator' : 'Finnhub WS'}</span></div>
                        <div className="flex justify-between py-3 text-xs"><span className="text-[#68705D]">History Points</span><span className="font-semibold tabular-nums">{selectedHistory.length}</span></div>
                        <div className="flex justify-between py-3 text-xs"><span className="text-[#68705D]">Currency</span><span className="font-semibold">{currency}</span></div>
                      </div>
                    </Card>
                  </div>
                  <Card className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold">{selectedTick.displaySymbol} Co-Movement Rules</h2>
                        <p className="mt-1 text-xs text-[#68705D]">Live association rules involving this stock</p>
                      </div>
                      <span className="rounded-md bg-[#6366F1]/10 px-2.5 py-1 text-[10px] font-semibold text-[#6366F1]">
                        {stockRules.length} matching rules
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded-lg border border-[#DDD8C8] bg-[#FFFDF7] p-3">
                        <div className="text-[10px] text-[#68705D]">Average Lift</div>
                        <div className="mt-1 text-lg font-bold tabular-nums text-[#6366F1]">{stockRuleMetrics.avgLift.toFixed(2)}x</div>
                      </div>
                      <div className="rounded-lg border border-[#DDD8C8] bg-[#FFFDF7] p-3">
                        <div className="text-[10px] text-[#68705D]">Average Confidence</div>
                        <div className="mt-1 text-lg font-bold tabular-nums text-[#10B981]">{(stockRuleMetrics.avgConfidence * 100).toFixed(1)}%</div>
                      </div>
                      <div className="rounded-lg border border-[#DDD8C8] bg-[#FFFDF7] p-3">
                        <div className="text-[10px] text-[#68705D]">Average Support</div>
                        <div className="mt-1 text-lg font-bold tabular-nums">{(stockRuleMetrics.avgSupport * 100).toFixed(1)}%</div>
                      </div>
                      <div className="rounded-lg border border-[#DDD8C8] bg-[#FFFDF7] p-3">
                        <div className="text-[10px] text-[#68705D]">Stable Rules</div>
                        <div className="mt-1 text-lg font-bold tabular-nums text-[#F59E0B]">{stockRuleMetrics.stable}</div>
                      </div>
                    </div>

                    {stockRules.length > 0 && (
                      <div className="mt-4 rounded-xl border border-[#DDD8C8] bg-[#F7F3E8] p-4">
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <span className="rounded-full bg-[#6366F1] px-2 py-1 text-white">Plain English</span>
                          <span>What these rules mean</span>
                        </div>
                        <div className="mt-3 grid md:grid-cols-3 gap-2">
                          {stockRules.slice(0, 3).map((rule) => (
                            <div key={`summary-${rule.id}`} className="rounded-lg border border-[#DDD8C8] bg-[#FFFDF7] p-3 text-xs leading-5">
                              <span className="font-semibold">{rule.antecedent.join(' + ')}</span>
                              {' tends to occur with '}
                              <span className="font-semibold">{rule.consequent.join(' + ')}</span>
                              <div className="mt-2 text-[10px] text-[#68705D]">
                                {(rule.confidence * 100).toFixed(0)}% confidence · {rule.lift.toFixed(2)}x lift
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {stockRules.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-4 rounded-lg border border-[#DDD8C8] bg-[#FFFDF7] px-3 py-2 text-[10px] text-[#68705D]">
                        <span className="font-semibold text-[#2F3428]">How to read</span>
                        <span><span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#6366F1]" />Selected stock</span>
                        <span><span className="mr-2 inline-block w-5 border-t-2 border-[#6366F1]" />Strong / higher confidence</span>
                        <span><span className="mr-2 inline-block w-5 border-t-2 border-dashed border-[#6366F1]" />Emerging / weaker pattern</span>
                        <span>Thicker lines indicate stronger lift</span>
                      </div>
                    )}

                    {stockRules.length > 0 ? (
                      <div className="mt-4 grid lg:grid-cols-[1.55fr_0.75fr] gap-4">
                        <svg viewBox="0 0 620 300" className="h-[300px] w-full rounded-xl border border-[#DDD8C8] bg-[#FFFDF7]" role="img" aria-label={`${selectedTick.displaySymbol} co-movement rule graph`}>
                          {(() => {
                            const nodeSet = new Set<string>([selectedTick.displaySymbol]);
                            stockRules.forEach((rule) => {
                              rule.antecedent.forEach((item) => nodeSet.add(item));
                              rule.consequent.forEach((item) => nodeSet.add(item));
                            });
                            const nodes = Array.from(nodeSet).map((id, index, items) => {
                              if (id === selectedTick.displaySymbol) return { id, x: 310, y: 150 };
                              const related = items.filter((item) => item !== selectedTick.displaySymbol);
                              const relatedIndex = related.indexOf(id);
                              const angle = (relatedIndex / Math.max(1, related.length)) * Math.PI * 2 - Math.PI / 2;
                              return {
                                id,
                                x: 310 + Math.cos(angle) * 210,
                                y: 150 + Math.sin(angle) * 105,
                              };
                            });
                            return (
                              <>
                                {stockRules.slice(0, 10).map((rule) => {
                                  const from = nodes.find((node) =>
                                    rule.antecedent.some((item) => item === node.id || node.id === selectedTick.displaySymbol && item.startsWith(`${selectedTick.displaySymbol}_`))
                                  );
                                  const to = nodes.find((node) =>
                                    rule.consequent.some((item) => item === node.id)
                                  );
                                  if (!from || !to) return null;
                                  return (
                                    <g key={rule.id}>
                                      <line
                                        x1={from.x}
                                        y1={from.y}
                                        x2={to.x}
                                        y2={to.y}
                                        stroke="#6366F1"
                                        strokeOpacity={Math.min(0.9, 0.35 + rule.confidence * 0.55)}
                                        strokeWidth={1.2 + rule.lift * 0.75}
                                        strokeDasharray={rule.stability === 'Stable' ? undefined : '6 5'}
                                      />
                                      <circle cx={(from.x + to.x) / 2} cy={(from.y + to.y) / 2} r="3.5" fill="#6366F1" />
                                    </g>
                                  );
                                })}
                                {nodes.map((node) => (
                                  <g key={node.id}>
                                    <circle cx={node.x} cy={node.y} r={node.id === selectedTick.displaySymbol ? 34 : 24} fill={node.id === selectedTick.displaySymbol ? '#6366F1' : '#F7F3E8'} stroke={node.id === selectedTick.displaySymbol ? '#4F46E5' : '#9BA685'} strokeWidth="2" />
                                    <text x={node.x} y={node.y + 4} textAnchor="middle" className="text-[9px] font-mono" fill={node.id === selectedTick.displaySymbol ? '#FFFFFF' : '#2F3428'}>
                                      {node.id.replace(/_(UP|DOWN|HighVol)$/, '')}
                                    </text>
                                  </g>
                                ))}
                              </>
                            );
                          })()}
                        </svg>

                        <div className="max-h-[300px] overflow-y-auto divide-y divide-[#DDD8C8]">
                          {stockRules.map((rule) => (
                            <div key={rule.id} className="py-3 text-xs">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`font-semibold ${rule.stability === 'Stable' ? 'text-[#10B981]' : rule.stability === 'Emerging' ? 'text-[#F59E0B]' : 'text-[#EF4444]'}`}>{rule.stability}</span>
                                <span className="tabular-nums font-bold text-[#6366F1]">{rule.lift.toFixed(2)} lift</span>
                              </div>
                              <div className="mt-2 leading-5">{rule.antecedent.join(' + ')} → {rule.consequent.join(' + ')}</div>
                              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E8E4D7]">
                                <div className="h-full rounded-full bg-[#6366F1]" style={{ width: `${Math.min(100, rule.confidence * 100)}%` }} />
                              </div>
                              <div className="mt-2 grid grid-cols-2 text-[10px] text-[#68705D] tabular-nums">
                                <span>Support {rule.support.toFixed(3)}</span>
                                <span className="text-right">Confidence {rule.confidence.toFixed(3)}</span>
                              </div>
                              <div className="mt-2 rounded-md bg-[#F7F3E8] px-2 py-1.5 text-[10px] leading-4 text-[#68705D]">
                                Read as: “When {rule.antecedent.join(' and ')} moves, {rule.consequent.join(' and ')} also tends to move.”
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 flex h-[240px] items-center justify-center rounded-xl border border-[#DDD8C8] bg-[#FFFDF7] text-xs text-[#68705D]">
                        No co-movement rules currently include {selectedTick.displaySymbol}.
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </div>
          </section>
        </>
      ) : (
        <>
          <Navbar
            mode={engine.mode}
            onOpenFinnhub={() => setFinnhubOpen(true)}
            onHome={enterHome}
            currency={currency}
            setCurrency={(nextCurrency) => {
              setCurrency(nextCurrency);
              localStorage.setItem('streammine_currency', nextCurrency);
            }}
          />
          <section id="terminal" className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-7 py-5 scroll-mt-20">
        {marketStarted && <><div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#10B981] animate-pulse" />
              <span className="text-xs text-[#10B981] font-semibold uppercase tracking-wider">Live market</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mt-1">StreamMine Terminal</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => engine.setIsRunning(!engine.isRunning)} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-[#1F2937] bg-[#111827] text-xs">
              {engine.isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {engine.isRunning ? 'Pause' : 'Resume'}
            </button>
            {[1, 2, 5].map((value) => (
              <button key={value} onClick={() => engine.setSpeed(value as 1 | 2 | 5)} className={`h-9 px-3 rounded-lg border text-xs ${engine.speed === value ? 'border-[#6366F1] bg-[#6366F1]/20 text-[#A5B4FC]' : 'border-[#1F2937] bg-[#111827] text-[#9CA3AF]'}`}>
                {value}x
              </button>
            ))}
          </div>
        </div>
        <Card className="mb-4 overflow-hidden">
          <div className="flex items-center border-b border-[#DDD8C8] px-3 py-2">
            <span className="text-xs font-semibold">Market Tape</span>
            <span className="ml-2 text-[10px] text-[#10B981]">LIVE</span>
          </div>
          <div className="market-tape flex whitespace-nowrap">
            {[...engine.latestTicks, ...engine.latestTicks].map((tick, index) => (
              <div key={`${tick.symbol}-${index}`} className="flex items-center gap-2 border-r border-[#DDD8C8] px-5 py-2.5 text-xs">
                <span className="font-semibold">{tick.displaySymbol}</span>
                <span className="tabular-nums text-[#68705D]">{formatPrice(tick.price)}</span>
                <span className={`tabular-nums ${tick.pctChange >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                  {tick.pctChange >= 0 ? '+' : ''}{tick.pctChange.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </Card>
        <KpiMetricCards eventsProcessed={engine.kafkaLogs.length} kafkaLagMs={engine.isRunning ? engine.speed * 4 : 0} activeWindows={engine.baskets.length} strongRulesCount={strongRulesCount} runtimeMs={engine.miningResult.runtimeMs} />
        <Card className="mt-4 p-1.5 sticky top-16 z-30 overflow-x-auto">
          <div className="flex min-w-max gap-1">
            {tabs.map(([value, label, icon]) => (
              <button key={value} onClick={() => setActiveTab(value)} className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${activeTab === value ? 'bg-[#6366F1] text-white shadow-lg shadow-[#6366F1]/10' : 'text-[#9CA3AF] hover:bg-[#1F2937] hover:text-white'}`}>
                {icon}{label}
              </button>
            ))}
          </div>
        </Card></>}
        <div className="mt-4">
          {activeTab === 'home' && (
            <div className="home-layer -mx-3 sm:-mx-5 lg:-mx-7 -mt-5 px-3 sm:px-5 lg:px-7 pb-10 pt-8 space-y-4">
              <Card className="overflow-hidden">
                <div className="grid lg:grid-cols-[1.4fr_1fr]">
                  <div className="p-6 sm:p-8">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-[#10B981]/30 bg-[#10B981]/10 text-[11px] font-semibold text-[#34D399]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                      System ready
                    </div>
                    <h2 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight">Welcome to StreamMine</h2>
                    <p className="mt-3 max-w-2xl text-sm sm:text-base leading-7 text-[#9CA3AF]">
                      Monitor live market movement, inspect Kafka-style event streams, discretize stock signals,
                      and discover statistically significant co-movement rules in one workspace.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <button onClick={enterDemo} className="px-5 py-3 rounded-lg bg-[#6366F1] text-sm font-semibold text-white hover:bg-[#4F46E5]">
                        Launch Demo
                      </button>
                      <button onClick={() => setFinnhubOpen(true)} className="px-5 py-3 rounded-lg border border-[#10B981]/40 bg-[#10B981]/10 text-sm font-semibold text-[#34D399] hover:border-[#10B981]">
                        Connect to Finnhub
                      </button>
                    </div>
                  </div>
                  <div className="border-t lg:border-t-0 lg:border-l border-[#1F2937] bg-[#090D16] p-6 sm:p-8">
                    <h3 className="text-sm font-semibold">Session status</h3>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-[#1F2937] p-3"><div className="text-[10px] uppercase text-[#6B7280]">Stream</div><div className="mt-1 text-sm font-semibold text-[#10B981]">{engine.isRunning ? 'Running' : 'Paused'}</div></div>
                      <div className="rounded-lg border border-[#1F2937] p-3"><div className="text-[10px] uppercase text-[#6B7280]">Assets</div><div className="mt-1 text-sm font-semibold tabular-nums">{engine.latestTicks.length}</div></div>
                      <div className="rounded-lg border border-[#1F2937] p-3"><div className="text-[10px] uppercase text-[#6B7280]">Windows</div><div className="mt-1 text-sm font-semibold tabular-nums">{engine.baskets.length}</div></div>
                      <div className="rounded-lg border border-[#1F2937] p-3"><div className="text-[10px] uppercase text-[#6B7280]">Rules</div><div className="mt-1 text-sm font-semibold tabular-nums">{engine.miningResult.rules.length}</div></div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="overflow-hidden p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="relative">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold">Real-Time Kafka Ingestion & Mining Pipeline</h3>
                      <button
                        type="button"
                        aria-label="Explain the real-time Kafka ingestion and mining pipeline"
                        aria-expanded={showPipelineInfo}
                        onClick={() => setShowPipelineInfo((current) => !current)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#DDD8C8] text-[#68705D] transition hover:border-[#6366F1] hover:text-[#6366F1]"
                      >
                        <CircleHelp className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-[#68705D]">Continuous event partitioning and association-rule discovery</p>
                    {showPipelineInfo && (
                      <div className="absolute left-0 top-10 z-30 w-[min(22rem,calc(100vw-3rem))] rounded-xl border border-[#DDD8C8] bg-[#FFFDF7] p-4 text-xs leading-5 text-[#68705D] shadow-xl">
                        <div className="font-semibold text-[#2F3428]">How the pipeline works</div>
                        <ol className="mt-3 space-y-2">
                          <li><span className="font-semibold text-[#6366F1]">1. Producer:</span> Live stock or crypto ticks arrive from the simulator or Finnhub WebSocket.</li>
                          <li><span className="font-semibold text-[#6366F1]">2. Kafka broker:</span> Each tick is added to a Kafka-style topic and assigned to one of three partitions.</li>
                          <li><span className="font-semibold text-[#6366F1]">3. Discretizer:</span> Rolling time windows convert prices and volume into simple signals such as UP or DOWN.</li>
                          <li><span className="font-semibold text-[#6366F1]">4. Rule engine:</span> FP-Growth or Apriori searches the signal baskets and finds patterns using support, confidence and lift.</li>
                          <li><span className="font-semibold text-[#6366F1]">5. Live alerts:</span> Strong patterns are shown as co-movement rules and updated as new market data arrives.</li>
                        </ol>
                      </div>
                    )}
                  </div>
                  <span className="rounded-md border border-[#DDD8C8] bg-[#F7F3E8] px-3 py-1.5 text-[10px] font-semibold tabular-nums text-[#68705D]">
                    NOMINAL · {engine.speed}x SPEED
                  </span>
                </div>

                <div className="relative mt-7">
                  <svg
                    viewBox="0 0 1000 220"
                    preserveAspectRatio="none"
                    className="pointer-events-none absolute inset-0 z-20 hidden h-full w-full md:block"
                    aria-hidden="true"
                  >
                    <defs>
                      <marker id="pipelineArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" />
                    </defs>
                    <g fill="none" stroke="#6366F1" strokeWidth="3">
                      <path className="pipeline-flow-line" d="M160 110 C180 110 182 110 205 110" />
                      <path className="pipeline-flow-line" d="M160 110 C178 110 188 82 205 82" />
                      <path className="pipeline-flow-line" d="M160 110 C178 110 188 138 205 138" />
                      <path className="pipeline-flow-line" d="M340 82 C375 82 390 82 410 82" />
                      <path className="pipeline-flow-line" d="M340 110 C375 110 390 110 410 110" />
                      <path className="pipeline-flow-line" d="M340 138 C375 138 390 138 410 138" />
                      <path className="pipeline-flow-line" d="M410 82 C432 82 438 110 455 110" />
                      <path className="pipeline-flow-line" d="M410 110 C432 110 438 110 455 110" />
                      <path className="pipeline-flow-line" d="M410 138 C432 138 438 110 455 110" />
                      <path className="pipeline-flow-line" d="M560 110 C585 110 595 110 620 110" />
                      <path className="pipeline-flow-line" d="M770 110 C800 110 810 110 840 110" />
                    </g>
                    <g fill="#6366F1">
                      <circle className="pipeline-flow-dot" cx="155" cy="110" r="5" />
                      <circle className="pipeline-flow-dot" cx="205" cy="82" r="5" style={{ animationDelay: '0.2s' }} />
                      <circle className="pipeline-flow-dot" cx="205" cy="110" r="5" style={{ animationDelay: '0.4s' }} />
                      <circle className="pipeline-flow-dot" cx="205" cy="138" r="5" style={{ animationDelay: '0.6s' }} />
                      <circle className="pipeline-flow-dot" cx="340" cy="82" r="5" style={{ animationDelay: '0.1s' }} />
                      <circle className="pipeline-flow-dot" cx="340" cy="110" r="5" style={{ animationDelay: '0.3s' }} />
                      <circle className="pipeline-flow-dot" cx="340" cy="138" r="5" style={{ animationDelay: '0.5s' }} />
                      <circle className="pipeline-flow-dot" cx="455" cy="110" r="6" style={{ animationDelay: '0.7s' }} />
                      <circle className="pipeline-flow-dot" cx="620" cy="110" r="5" style={{ animationDelay: '0.2s' }} />
                      <circle className="pipeline-flow-dot" cx="840" cy="110" r="5" style={{ animationDelay: '0.4s' }} />
                    </g>
                  </svg>
                  <div className="relative z-10 grid grid-cols-1 gap-4 md:grid-cols-[1fr_1.35fr_1fr_1fr_1fr] md:items-center">
                  <button onClick={() => setActiveTab('overview')} className="rounded-xl border border-[#DDD8C8] bg-[#FFFDF7] p-4 text-left shadow-sm transition hover:border-[#6366F1]">
                    <Radio className="mb-3 h-5 w-5 text-[#6366F1]" />
                    <div className="text-sm font-semibold">{engine.mode === 'simulator' ? 'Producer' : 'Finnhub WS'}</div>
                    <div className="mt-1 text-[11px] text-[#68705D]">{engine.latestTicks.length} equity feeds</div>
                    <div className="mt-3 text-[10px] font-mono text-[#68705D]">{engine.isRunning ? '14 msg/s' : 'paused'}</div>
                  </button>

                  <Card className="relative z-10 overflow-visible border-[#9BA685] p-0">
                    <div className="h-1.5 bg-[#9BA685]" />
                    <div className="p-4">
                      <div className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-[#68705D]" />
                        <div>
                          <div className="text-sm font-semibold">Kafka Broker</div>
                          <div className="text-[10px] text-[#68705D]">stock-ticks-raw</div>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2">
                        {[0, 1, 2].map((partition) => (
                          <div key={partition} className="grid grid-cols-[30px_1fr] items-center gap-2 text-[10px]">
                            <span className="rounded bg-[#E8E4D7] px-2 py-1 text-center font-mono">P{partition}</span>
                            <span className="truncate text-[#68705D]">#{engine.kafkaLogs.filter((log) => log.partition === partition).length}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 text-[10px] text-[#68705D]">Lag · 9 ms</div>
                    </div>
                  </Card>

                  <button onClick={() => setActiveTab('discretizer')} className="rounded-xl border border-[#DDD8C8] bg-[#FFFDF7] p-4 text-left shadow-sm transition hover:border-[#6366F1]">
                    <SlidersHorizontal className="mb-3 h-5 w-5 text-[#6366F1]" />
                    <div className="text-sm font-semibold">Discretizer</div>
                    <div className="mt-1 text-[11px] text-[#68705D]">Sliding Window</div>
                    <div className="mt-3 text-[10px] font-mono text-[#68705D]">{engine.baskets.length} baskets</div>
                  </button>

                  <button onClick={() => setActiveTab('rules')} className="rounded-xl border border-[#DDD8C8] bg-[#FFFDF7] p-4 text-left shadow-sm transition hover:border-[#6366F1]">
                    <Sparkles className="mb-3 h-5 w-5 text-[#6366F1]" />
                    <div className="text-sm font-semibold">{engine.miningConfig.algorithm}</div>
                    <div className="mt-1 text-[11px] text-[#68705D]">Rule Engine</div>
                    <div className="mt-3 text-[10px] font-mono text-[#68705D]">{engine.miningResult.runtimeMs} ms</div>
                  </button>

                  <button onClick={() => setActiveTab('rules')} className="rounded-xl border border-[#DDD8C8] bg-[#FFFDF7] p-4 text-left shadow-sm transition hover:border-[#10B981]">
                    <Activity className="mb-3 h-5 w-5 text-[#10B981]" />
                    <div className="text-sm font-semibold">Live Alerts</div>
                    <div className="mt-1 text-[11px] text-[#68705D]">Mined Rules</div>
                    <div className="mt-3 text-[10px] font-mono text-[#68705D]">{engine.miningResult.rules.length} rules</div>
                  </button>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">Technology stack</h3>
                    <p className="mt-1 text-xs text-[#9CA3AF]">The core technologies used by StreamMine.</p>
                  </div>
                  <span className="text-[10px] font-mono text-[#10B981]">REAL-TIME ANALYTICS</span>
                </div>
                <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {[
                    ['React + TypeScript', 'Interactive interface'],
                    ['Apache Kafka concepts', 'Partitioned event streaming'],
                    ['FP-Growth / Apriori', 'Association rule mining'],
                    ['Finnhub WebSocket', 'Live market trade data'],
                    ['Tailwind + Lenis', 'Responsive UI and smooth scrolling'],
                  ].map(([title, description]) => (
                    <div key={title} className="relative rounded-lg border border-[#1F2937] bg-[#090D16] p-4">
                      <div className="text-xs font-semibold">{title}</div>
                      <div className="mt-2 text-[11px] leading-5 text-[#9CA3AF]">{description}</div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold">Contact Us</h3>
                  <p className="mt-1 text-xs text-[#9CA3AF]">Questions or feedback about StreamMine? We'd love to hear from you.</p>
                  <p className="mt-3 inline-flex items-center gap-2 text-xs text-[#9CA3AF]">
                    <Heart className="h-4 w-4 text-[#F472B6]" />
                    Thank you for your interest and support!
                  </p>
                </div>
                <div className="flex flex-col items-start gap-2">
                  <a
                    href="mailto:rathortarunkumar76@gmail.com"
                    className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#1F2937] px-4 py-2 text-sm font-semibold text-[#F9FAFB] transition hover:border-[#6366F1] hover:text-[#818CF8]"
                  >
                    <Mail className="h-4 w-4" />
                    rathortarunkumar76@gmail.com
                  </a>
                </div>
              </Card>
            </div>
          )}
          {activeTab === 'overview' && (
            <div className="grid xl:grid-cols-[1fr_1.55fr] gap-4">
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3"><h2 className="text-sm font-semibold">Search Stocks</h2><span className="text-[10px] text-[#10B981]">STREAMING</span></div>
                  <input value={stockSearch} onChange={(event) => setStockSearch(event.target.value)} placeholder="Search symbol or sector..." className="mb-3 w-full rounded-lg border border-[#DDD8C8] bg-[#FFFDF7] px-3 py-2 text-sm outline-none focus:border-[#6366F1]" />
                  <div className="divide-y divide-[#DDD8C8]">
                    {searchedTicks.slice(0, 8).map((tick) => (
                      <button key={tick.symbol} onClick={() => openStockDetail(tick.displaySymbol)} className={`grid w-full grid-cols-[1fr_90px_70px] items-center py-2.5 text-left text-xs ${selectedStock === tick.displaySymbol ? 'text-[#6366F1]' : ''}`}>
                        <div><span className="font-semibold">{tick.displaySymbol}</span><span className="ml-2 text-[10px] text-[#7A806F]">{tick.sector}</span></div>
                        <span className="tabular-nums">{formatPrice(tick.price)}</span>
                        <span className={`tabular-nums text-right ${tick.pctChange >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>{tick.pctChange >= 0 ? '+' : ''}{tick.pctChange.toFixed(2)}%</span>
                      </button>
                    ))}
                  </div>
                </Card>
                <Card className="overflow-hidden p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">Tracked Market Capitalization</h3>
                      <p className="mt-1 text-[10px] text-[#68705D]">Live weighted total across {engine.latestTicks.length} tracked stocks</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#10B981]"><span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />1-second refresh</span>
                  </div>
                  <div className="mt-3 flex items-end gap-3">
                    <div className="text-2xl font-bold tabular-nums">{formatMarketCap(latestMarketCap)}</div>
                    <div className={`pb-1 text-xs font-semibold tabular-nums ${marketCapChange >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                      {marketCapChange >= 0 ? '+' : ''}{marketCapChange.toFixed(4)}%
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {(['1H', '1D', '1W', '1M'] as const).map((range) => (
                        <button
                          key={range}
                          onClick={() => setMarketCapRange(range)}
                          className={`rounded-md px-2.5 py-1 text-[10px] font-semibold ${marketCapRange === range ? 'bg-[#6366F1] text-white' : 'text-[#68705D] hover:bg-[#E8E4D7]'}`}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] text-[#68705D]">
                      {marketCapRange === '1M'
                        ? `${new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – Today`
                        : marketCapRange === '1W'
                          ? 'Past 7 days'
                          : marketCapRange === '1D'
                            ? 'Past 24 hours'
                            : 'Past 60 minutes'}
                    </span>
                  </div>
                  {marketCapHistory.length > 1 ? (
                    <svg viewBox="0 0 760 260" className="mt-3 h-52 w-full" role="img" aria-label="Live overall market capitalization history">
                      {[30, 78, 126, 174, 222].map((y) => (
                        <g key={y}>
                          <line x1="58" y1={y} x2="742" y2={y} stroke="#DDD8C8" strokeWidth="1" strokeDasharray="4 6" />
                          <text x="48" y={y + 3} textAnchor="end" fill="#68705D" fontSize="8">T</text>
                        </g>
                      ))}
                      {[58, 190, 322, 454, 586, 742].map((x) => (
                        <line key={x} x1={x} y1="30" x2={x} y2="222" stroke="#DDD8C8" strokeWidth="1" strokeDasharray="4 6" />
                      ))}
                      {(() => {
                        const count = marketCapRange === '1M' ? 31 : marketCapRange === '1W' ? 7 : marketCapRange === '1D' ? 24 : 60;
                        const trend = marketCapRange === '1M' ? 0.082 : marketCapRange === '1W' ? 0.034 : marketCapRange === '1D' ? 0.018 : 0.009;
                        const liveValue = latestMarketCap * CURRENCIES[currency].rate;
                        const values = Array.from({ length: count }, (_, index) => {
                          const progress = index / (count - 1);
                          const wave = Math.sin(index * 0.72) * liveValue * 0.0028;
                          const rangeValue = liveValue * (1 - trend * (1 - progress)) + wave * (1 - progress);
                          return index === count - 1 ? liveValue : rangeValue;
                        });
                        const observedMin = Math.min(...values);
                        const observedMax = Math.max(...values);
                        const min = observedMin * 0.995;
                        const max = observedMax * 1.005;
                        const range = max - min || 1;
                        const points = values.map((value, index) => ({
                          x: 58 + (index / (values.length - 1)) * 684,
                          y: 222 - ((value - min) / range) * 192,
                        }));
                        const line = points.map((point) => `${point.x},${point.y}`).join(' ');
                        const area = points.length ? `58,222 ${line} ${points[points.length - 1].x},222` : '';
                        return (
                          <>
                            <defs>
                              <linearGradient id="marketCapArea" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366F1" stopOpacity="0.28" />
                                <stop offset="100%" stopColor="#6366F1" stopOpacity="0.02" />
                              </linearGradient>
                            </defs>
                            {area && <polygon points={area} fill="url(#marketCapArea)" />}
                            <polyline points={line} fill="none" stroke="#6366F1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            {points.map((point, index) => index === points.length - 1 ? (
                              <g key={index}><circle cx={point.x} cy={point.y} r="8" fill="#6366F1" fillOpacity="0.14" /><circle cx={point.x} cy={point.y} r="4" fill="#10B981" stroke="#FFFDF7" strokeWidth="2" /></g>
                            ) : null)}
                            <text x="58" y="248" fill="#68705D" fontSize="8">
                              {marketCapRange === '1M'
                                ? new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                : marketCapRange === '1W'
                                  ? '7 days ago'
                                  : marketCapRange === '1D'
                                    ? '24 hours ago'
                                    : '60 minutes ago'}
                            </text>
                            <text x="742" y="248" textAnchor="end" fill="#68705D" fontSize="8">Today · {marketCapUpdatedAt.toLocaleTimeString()}</text>
                            <text x="48" y="34" textAnchor="end" fill="#68705D" fontSize="8">{formatMarketCap(max)}</text>
                            <text x="48" y="226" textAnchor="end" fill="#68705D" fontSize="8">{formatMarketCap(min)}</text>
                          </>
                        );
                      })()}
                    </svg>
                  ) : (
                    <div className="mt-3 flex h-52 items-center justify-center text-xs text-[#68705D]">Collecting market-cap history...</div>
                  )}
                  <div className="grid grid-cols-3 gap-2 border-t border-[#DDD8C8] pt-3 text-[10px]">
                    <div><div className="text-[#68705D]">Advancing</div><div className="mt-1 font-semibold text-[#10B981]">{engine.latestTicks.filter((tick) => tick.pctChange >= 0).length} stocks</div></div>
                    <div><div className="text-[#68705D]">Declining</div><div className="mt-1 font-semibold text-[#EF4444]">{engine.latestTicks.filter((tick) => tick.pctChange < 0).length} stocks</div></div>
                    <div><div className="text-[#68705D]">Data points</div><div className="mt-1 font-semibold tabular-nums">{marketCapHistory.length}</div></div>
                  </div>
                </Card>
                <PartitionChart logs={engine.kafkaLogs} />
              </div>
              <RuleExplorer rules={engine.miningResult.rules} runtimeMs={engine.miningResult.runtimeMs} config={engine.miningConfig} setConfig={engine.setMiningConfig} />
            </div>
          )}
          {activeTab === 'kafka' && (
            <div className="space-y-4">
              <Card className="p-1.5"><div className="flex flex-wrap gap-1">{([
                ['feed', 'Live Feed'], ['partitions', 'Partition Load'], ['topics', 'Topics'],
              ] as const).map(([value, label]) => <button key={value} onClick={() => setKafkaSubTab(value)} className={`px-3 py-2 rounded-md text-xs font-semibold ${kafkaSubTab === value ? 'bg-[#1F2937] text-white' : 'text-[#9CA3AF]'}`}>{label}</button>)}</div></Card>
              {kafkaSubTab === 'feed' && <LiveMessageFeed logs={displayKafkaLogs} />}
              {kafkaSubTab === 'partitions' && <div className="grid md:grid-cols-2 gap-4"><PartitionChart logs={engine.kafkaLogs} /><Card className="p-5"><h3 className="text-sm font-semibold">Partition Details</h3><div className="mt-4 space-y-3">{[0, 1, 2].map((partition) => <div key={partition} className="flex justify-between text-xs border-b border-[#1F2937] pb-3"><span className="text-[#9CA3AF]">P{partition}</span><span className="tabular-nums">{engine.kafkaLogs.filter((message) => message.partition === partition).length} messages</span></div>)}</div></Card></div>}
              {kafkaSubTab === 'topics' && <div className="grid md:grid-cols-3 gap-4">{(['stock-ticks-raw', 'discretized-events', 'mined-rules'] as const).map((topic) => <Card key={topic} className="p-5"><Database className="w-5 h-5 text-[#6366F1]" /><h3 className="mt-3 text-sm font-semibold">{topic}</h3><p className="mt-2 text-xs text-[#6B7280]">{engine.kafkaLogs.filter((message) => message.topic === topic).length} buffered events</p></Card>)}</div>}
            </div>
          )}
          {activeTab === 'discretizer' && (
            <div className="space-y-4">
              <Card className="p-1.5"><div className="flex flex-wrap gap-1">{([
                ['parameters', 'Parameters'], ['baskets', 'Rolling Baskets'], ['ticks', 'Open Window Ticks'],
              ] as const).map(([value, label]) => <button key={value} onClick={() => setDiscretizerSubTab(value)} className={`px-3 py-2 rounded-md text-xs font-semibold ${discretizerSubTab === value ? 'bg-[#1F2937] text-white' : 'text-[#9CA3AF]'}`}>{label}</button>)}</div></Card>
              {discretizerSubTab === 'parameters' && <DiscretizerLab config={engine.discretizerConfig} setConfig={engine.setDiscretizerConfig} baskets={[]} openWindowTicks={[]} />}
              {discretizerSubTab === 'baskets' && <Card className="p-5"><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{engine.baskets.slice(-30).reverse().map((basket) => <Card key={basket.windowId} className="p-4"><div className="flex justify-between text-xs"><span>Window {basket.windowId}</span><span className="text-[#6B7280]">{basket.rawTicks} ticks</span></div><div className="mt-3 flex flex-wrap gap-1">{basket.items.slice(0, 12).map((item) => <span key={item} className="px-2 py-1 rounded bg-[#1F2937] text-[10px]">{item}</span>)}</div></Card>)}</div></Card>}
              {discretizerSubTab === 'ticks' && <Card className="p-5"><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{engine.openWindowTicks.slice(-60).map((tick, index) => <div key={`${tick.symbol}-${tick.timestamp}-${index}`} className="flex justify-between rounded-lg border border-[#1F2937] p-3 text-xs"><span>{tick.displaySymbol}</span><span className={tick.pctChange >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}>{tick.pctChange.toFixed(2)}%</span></div>)}</div></Card>}
            </div>
          )}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <Card className="p-1.5"><div className="flex flex-wrap gap-1">{([
                ['graph', 'Rule Graph'], ['rules', 'Rules Table'], ['engine', 'Mining Engine'],
              ] as const).map(([value, label]) => <button key={value} onClick={() => setRulesSubTab(value)} className={`px-3 py-2 rounded-md text-xs font-semibold ${rulesSubTab === value ? 'bg-[#1F2937] text-white' : 'text-[#9CA3AF]'}`}>{label}</button>)}</div></Card>
              {rulesSubTab === 'graph' && <RuleExplorer rules={engine.miningResult.rules} runtimeMs={engine.miningResult.runtimeMs} config={engine.miningConfig} setConfig={engine.setMiningConfig} />}
              {rulesSubTab === 'rules' && <Card className="p-5"><div className="divide-y divide-[#1F2937]">{engine.miningResult.rules.map((rule) => <div key={rule.id} className="grid md:grid-cols-[1fr_90px_100px_80px] gap-3 py-3 text-xs items-center"><div>{rule.antecedent.join(' + ')} <span className="text-[#818CF8]">→</span> {rule.consequent.join(' + ')}</div><span>Support {rule.support.toFixed(3)}</span><span>Confidence {rule.confidence.toFixed(3)}</span><span className="text-[#10B981] font-bold">Lift {rule.lift.toFixed(2)}</span></div>)}</div></Card>}
              {rulesSubTab === 'engine' && <Card className="p-5"><div className="grid md:grid-cols-2 gap-6"><RuleExplorer rules={[]} runtimeMs={engine.miningResult.runtimeMs} config={engine.miningConfig} setConfig={engine.setMiningConfig} /><Card className="p-5"><h3 className="text-sm font-semibold">Engine Metrics</h3><div className="mt-4 space-y-3 text-xs"><div className="flex justify-between"><span className="text-[#9CA3AF]">Frequent itemsets</span><span className="tabular-nums">{engine.miningResult.frequentItemsetsCount}</span></div><div className="flex justify-between"><span className="text-[#9CA3AF]">Discovered rules</span><span className="tabular-nums">{engine.miningResult.rules.length}</span></div><div className="flex justify-between"><span className="text-[#9CA3AF]">Runtime</span><span className="tabular-nums">{engine.miningResult.runtimeMs} ms</span></div></div></Card></div></Card>}
            </div>
          )}
          {activeTab === 'operations' && (
            <div className="space-y-4">
              <Card className="p-1.5"><div className="flex flex-wrap gap-1">{([
                ['shocks', 'Market Shocks'], ['speed', 'Stream Speed'], ['session', 'Session Controls'],
              ] as const).map(([value, label]) => <button key={value} onClick={() => setOperationsSubTab(value)} className={`px-3 py-2 rounded-md text-xs font-semibold ${operationsSubTab === value ? 'bg-[#1F2937] text-white' : 'text-[#9CA3AF]'}`}>{label}</button>)}</div></Card>
              {operationsSubTab === 'shocks' && <Card className="p-5"><div className="mb-5"><h2 className="text-lg font-semibold">Market Shock Operations</h2><p className="text-sm text-[#9CA3AF] mt-1">Inject a correlated sector event into the live simulator.</p></div><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">{(['NONE', 'TECH_RALLY', 'OIL_SPIKE', 'BANKING_SELLOFF'] as ShockType[]).map((value) => <button key={value} onClick={() => engine.triggerShock(value)} className={`min-h-32 p-4 rounded-xl border text-left transition ${engine.shock === value ? 'border-[#F59E0B] bg-[#F59E0B]/10' : 'border-[#1F2937] bg-[#090D16] hover:border-[#6366F1]'}`}><Flame className={`w-5 h-5 ${engine.shock === value ? 'text-[#F59E0B]' : 'text-[#9CA3AF]'}`} /><div className="mt-4 font-semibold">{SHOCK_LABELS[value]}</div><div className="mt-1 text-xs text-[#6B7280]">{value === 'NONE' ? 'Restore normal market movement' : `Apply ${SHOCK_LABELS[value].toLowerCase()} sector behavior`}</div></button>)}</div></Card>}
              {operationsSubTab === 'speed' && <Card className="p-5"><div className="grid sm:grid-cols-3 gap-3">{[1, 2, 5].map((value) => <button key={value} onClick={() => engine.setSpeed(value as 1 | 2 | 5)} className={`p-5 rounded-xl border ${engine.speed === value ? 'border-[#6366F1] bg-[#6366F1]/10' : 'border-[#1F2937]'}`}><div className="text-2xl font-bold">{value}x</div><div className="mt-1 text-xs text-[#9CA3AF]">{value === 1 ? 'Real-time' : value === 2 ? 'Fast stream' : 'Maximum stream'}</div></button>)}</div></Card>}
              {operationsSubTab === 'session' && <Card className="p-5"><div className="flex flex-wrap gap-3"><button onClick={() => engine.setIsRunning(!engine.isRunning)} className="px-4 py-3 rounded-lg border border-[#1F2937] text-sm">{engine.isRunning ? 'Pause stream' : 'Resume stream'}</button><button onClick={() => engine.clearLogs()} className="px-4 py-3 rounded-lg border border-[#1F2937] text-sm">Clear Kafka buffer</button><button onClick={() => engine.triggerShock('NONE')} className="px-4 py-3 rounded-lg border border-[#1F2937] text-sm">Reset shock state</button></div></Card>}
            </div>
          )}
        </div>
      </section>
        </>
      )}
      <FinnhubModal
        open={finnhubOpen}
        onClose={() => setFinnhubOpen(false)}
        mode={engine.mode}
        setMode={(targetMode) => {
          if (targetMode === 'simulator') enterDemo();
          else enterFinnhub(targetMode);
        }}
        apiKey={engine.apiKey}
        setApiKey={engine.setApiKey}
        status={engine.finnhubStatus}
      />
    </div>
  );
}
