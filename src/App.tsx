import React, { useEffect, useMemo, useState } from 'react';
import Lenis from 'lenis';
import {
  Activity,
  CircleHelp,
  Database,
  Heart,
  Mail,
  Radio,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { useStreamEngine } from './hooks/useStreamEngine';
import { Navbar } from './components/layout/Navbar';
import { KpiMetricCards } from './components/pipeline/KpiMetricCards';
import { PartitionChart } from './components/kafka/PartitionChart';
import { LiveMessageFeed } from './components/kafka/LiveMessageFeed';
import { FinnhubModal } from './components/kafka/FinnhubModal';
import { PriceChart } from './components/charts/PriceChart';
import { DiscretizerLab } from './components/mining/DiscretizerLab';
import { RuleExplorer } from './components/mining/RuleExplorer';
import { Card } from './components/ui/Primitives';
import { FinnhubChartRange } from './engine/finnhubService';
import { PriceForecastPanel } from './components/prediction/PriceForecastPanel';
import { PaperTrader } from './components/trading/PaperTrader';
import { ShockReplayAlerts } from './components/mining/ShockReplayAlerts';
import { LeadLagBenchmark } from './components/mining/LeadLagBenchmark';
import { NewsSentimentInjector } from './components/mining/NewsSentimentInjector';
import { TotalMarketCapChart } from './components/market/TotalMarketCapChart';
import { StockDecisionDrawer } from './components/prediction/StockDecisionDrawer';
import { BrainCircuit, DollarSign, Film } from 'lucide-react';

type TerminalTab = 'home' | 'overview' | 'kafka' | 'discretizer' | 'rules' | 'ai-forecast' | 'paper-trading' | 'shock-replay';
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
  const [finnhubOpen, setFinnhubOpen] = useState(false);
  const [marketStarted, setMarketStarted] = useState(false);
  const [stockSearch, setStockSearch] = useState('');
  const [selectedStock, setSelectedStock] = useState('');
  const [detailStock, setDetailStock] = useState<typeof engine.latestTicks[number] | null>(null);
  const [workspaceLayer, setWorkspaceLayer] = useState<WorkspaceLayer>('home');
  const [showPipelineInfo, setShowPipelineInfo] = useState(false);
  const [chartRange, setChartRange] = useState<FinnhubChartRange>('1D');
  const [currency, setCurrency] = useState<CurrencyCode>(() =>
    (localStorage.getItem('streammine_currency') as CurrencyCode) || 'USD'
  );
  const [decisionDrawerStock, setDecisionDrawerStock] = useState<string | null>(null);

  const convertPrice = (price: number) => price * CURRENCIES[currency].rate;
  const formatPrice = (price: number) => {
    const converted = convertPrice(price);
    return `${CURRENCIES[currency].symbol}${converted.toFixed(converted < 10 ? 4 : 2)}`;
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
  }, [engine.latestTicks, selectedStock]);

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
  const twentyFourHourChange = useMemo(() => {
    if (!selectedTick?.previousClose || selectedTick.previousClose <= 0) return 0;
    return ((selectedTick.price - selectedTick.previousClose) / selectedTick.previousClose) * 100;
  }, [selectedTick?.price, selectedTick?.previousClose]);
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
    ['ai-forecast', 'AI Forecast (LSTM)', <BrainCircuit key="ai" className="w-4 h-4 text-[#6366F1]" />],
    ['paper-trading', 'Paper Trading', <DollarSign key="trade" className="w-4 h-4 text-[#10B981]" />],
    ['shock-replay', 'Shock Replay & Alerts', <Film key="shock" className="w-4 h-4 text-[#F59E0B]" />],
    ['kafka', 'Kafka Stream', <Database key="kafka" className="w-4 h-4" />],
    ['discretizer', 'Discretizer', <SlidersHorizontal key="discretizer" className="w-4 h-4" />],
    ['rules', 'Rule Graph', <Sparkles key="rules" className="w-4 h-4" />],
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
                            <p className="mt-1 text-xs text-[#68705D]">{selectedTick.sector} · Finnhub Live</p>
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
                    <PriceChart
                      symbol={selectedTick.symbol}
                      displaySymbol={selectedTick.displaySymbol}
                      latestTick={selectedTick}
                      range={chartRange}
                      onRangeChange={setChartRange}
                      formatPrice={formatPrice}
                    />

                    <Card className="p-5">
                      <h2 className="text-sm font-semibold">Stock Details</h2>
                      <div className="mt-4 divide-y divide-[#DDD8C8]">
                        <div className="flex justify-between py-3 text-xs"><span className="text-[#68705D]">Symbol</span><span className="font-semibold">{selectedTick.displaySymbol}</span></div>
                        <div className="flex justify-between py-3 text-xs"><span className="text-[#68705D]">Sector</span><span className="font-semibold">{selectedTick.sector}</span></div>
                        <div className="flex justify-between py-3 text-xs"><span className="text-[#68705D]">Volume Ratio</span><span className="font-semibold tabular-nums">{selectedTick.volumeRatio.toFixed(2)}x</span></div>
                        <div className="flex justify-between py-3 text-xs"><span className="text-[#68705D]">Data Source</span><span className="font-semibold">Finnhub WS</span></div>
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
        </div>
        <Card className="mb-4 overflow-hidden border-[#1F2937] bg-[#111827]/90 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between border-b border-[#1F2937] px-4 py-2 bg-[#090D16]/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#F9FAFB]">Market Tape</span>
              <span className="flex items-center gap-1 text-[10px] font-mono text-[#10B981] px-1.5 py-0.5 rounded bg-[#10B981]/10 border border-[#10B981]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                LIVE
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#9CA3AF]">Continuous Finnhub Feed</span>
          </div>
          <div className="market-tape flex whitespace-nowrap py-1">
            {[...engine.latestTicks, ...engine.latestTicks].map((tick, index) => (
              <button
                key={`${tick.symbol}-${index}`}
                onClick={() => setDecisionDrawerStock(tick.displaySymbol)}
                className="flex items-center gap-2.5 border-r border-[#1F2937] px-5 py-2 text-xs font-mono hover:bg-[#1F2937]/50 transition-colors cursor-pointer group"
              >
                <span className="font-bold text-[#F9FAFB] group-hover:text-[#6366F1] transition-colors">{tick.displaySymbol}</span>
                <span className="tabular-nums text-[#9CA3AF]">{formatPrice(tick.price)}</span>
                <span className={`tabular-nums font-semibold px-1 rounded ${tick.pctChange >= 0 ? 'text-[#10B981] bg-[#10B981]/10' : 'text-[#EF4444] bg-[#EF4444]/10'}`}>
                  {tick.pctChange >= 0 ? '+' : ''}{tick.pctChange.toFixed(2)}%
                </span>
              </button>
            ))}
          </div>
        </Card>
        <KpiMetricCards eventsProcessed={engine.kafkaLogs.length} activeWindows={engine.baskets.length} strongRulesCount={strongRulesCount} runtimeMs={engine.miningResult.runtimeMs} />

        {/* 2nd-Layer Total Market Cap Graph */}
        <div className="mt-4">
          <TotalMarketCapChart
            latestTicks={engine.latestTicks}
            mode={engine.mode}
            onSelectStock={(sym) => setDecisionDrawerStock(sym)}
            currency={currency}
          />
        </div>

        <Card className="mt-4 p-1.5 sticky top-16 z-30 overflow-x-auto bg-[#111827] border-[#1F2937]">
          <div className="flex min-w-max gap-1">
            {tabs.map(([value, label, icon]) => (
              <button
                key={value}
                onClick={() => setActiveTab(value)}
                className={`relative inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  activeTab === value
                    ? 'bg-[#6366F1] text-white shadow-lg shadow-[#6366F1]/20'
                    : 'text-[#9CA3AF] hover:bg-[#1F2937] hover:text-[#F9FAFB]'
                }`}
              >
                {icon}
                {label}
                {activeTab === value && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-white/40 rounded-full" />
                )}
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
                      {engine.finnhubStatus.state === 'connected'
                        ? 'Finnhub connected'
                        : engine.finnhubStatus.state === 'error'
                          ? 'Finnhub connection error'
                          : 'Connecting to Finnhub'}
                    </div>
                    <h2 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight">Welcome to StreamMine</h2>
                    <p className="mt-3 max-w-2xl text-sm sm:text-base leading-7 text-[#9CA3AF]">
                      Monitor live market movement, inspect Kafka-style event streams, discretize stock signals,
                      and discover statistically significant co-movement rules in one workspace.
                    </p>
                    <button
                      onClick={() => enterFinnhub(engine.mode)}
                      className="mt-6 rounded-lg bg-[#6366F1] px-5 py-3 text-sm font-semibold text-white hover:bg-[#4F46E5]"
                    >
                      Get Started
                    </button>
                  </div>
                  <div className="border-t lg:border-t-0 lg:border-l border-[#1F2937] bg-[#090D16] p-6 sm:p-8">
                    <h3 className="text-sm font-semibold">Session status</h3>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-[#1F2937] p-3"><div className="text-[10px] uppercase text-[#6B7280]">Stream</div><div className="mt-1 text-sm font-semibold text-[#10B981]">{engine.finnhubStatus.state === 'connected' ? 'Connected' : engine.finnhubStatus.state === 'error' ? 'Error' : 'Connecting'}</div></div>
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
                          <li><span className="font-semibold text-[#6366F1]">1. Producer:</span> Live stock or crypto ticks arrive from the Finnhub WebSocket.</li>
                          <li><span className="font-semibold text-[#6366F1]">2. Kafka broker:</span> Each tick is added to a Kafka-style topic and assigned to one of three partitions.</li>
                          <li><span className="font-semibold text-[#6366F1]">3. Discretizer:</span> Rolling time windows convert prices and volume into simple signals such as UP or DOWN.</li>
                          <li><span className="font-semibold text-[#6366F1]">4. Rule engine:</span> FP-Growth or Apriori searches the signal baskets and finds patterns using support, confidence and lift.</li>
                          <li><span className="font-semibold text-[#6366F1]">5. Live alerts:</span> Strong patterns are shown as co-movement rules and updated as new market data arrives.</li>
                        </ol>
                      </div>
                    )}
                  </div>
                  <span className="rounded-md border border-[#DDD8C8] bg-[#F7F3E8] px-3 py-1.5 text-[10px] font-semibold tabular-nums text-[#68705D]">
                    LIVE · FINNHUB
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
                    <div className="text-sm font-semibold">Finnhub WS</div>
                    <div className="mt-1 text-[11px] text-[#68705D]">{engine.latestTicks.length} equity feeds</div>
                    <div className="mt-3 text-[10px] font-mono text-[#68705D]">{engine.finnhubStatus.state}</div>
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
                <PriceChart
                  symbol={selectedTick?.symbol ?? (displayTicks[0]?.symbol ?? '')}
                  displaySymbol={selectedTick?.displaySymbol ?? (displayTicks[0]?.displaySymbol ?? 'Market')}
                  latestTick={selectedTick ?? displayTicks[0]}
                  range={chartRange}
                  onRangeChange={setChartRange}
                  formatPrice={formatPrice}
                />
                <Card className="grid grid-cols-2 gap-3 p-4 text-xs">
                  <div>
                    <div className="text-[#68705D]">Advancing</div>
                    <div className="mt-1 font-semibold text-[#10B981]">{engine.latestTicks.filter((tick) => tick.pctChange >= 0).length} assets</div>
                  </div>
                  <div>
                    <div className="text-[#68705D]">Declining</div>
                    <div className="mt-1 font-semibold text-[#EF4444]">{engine.latestTicks.filter((tick) => tick.pctChange < 0).length} assets</div>
                  </div>
                </Card>
                <PartitionChart logs={engine.kafkaLogs} />
              </div>
              <RuleExplorer rules={engine.miningResult.rules} runtimeMs={engine.miningResult.runtimeMs} config={engine.miningConfig} setConfig={engine.setMiningConfig} />
            </div>
          )}
          {activeTab === 'kafka' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Card className="p-1.5"><div className="flex flex-wrap gap-1">{([
                  ['feed', 'Live Feed'], ['partitions', 'Partition Load'], ['topics', 'Topics'],
                ] as const).map(([value, label]) => <button key={value} onClick={() => setKafkaSubTab(value)} className={`px-3 py-2 rounded-md text-xs font-semibold ${kafkaSubTab === value ? 'bg-[#1F2937] text-white' : 'text-[#9CA3AF]'}`}>{label}</button>)}</div></Card>
                <button onClick={engine.clearLogs} className="px-3 py-2 rounded-lg border border-[#1F2937] text-xs text-[#9CA3AF]">
                  Clear Kafka buffer
                </button>
              </div>
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
          {activeTab === 'ai-forecast' && (
            <div className="space-y-4">
              <PriceForecastPanel
                symbol={selectedTick?.displaySymbol || selectedStock || (engine.latestTicks[0]?.displaySymbol ?? 'AAPL')}
                currentPrice={selectedTick?.price || (engine.latestTicks.find(t => t.displaySymbol === selectedStock)?.price ?? (engine.latestTicks[0]?.price ?? 180))}
                activeLift={engine.miningResult.rules[0]?.lift ?? 1.35}
                recentTicks={engine.latestTicks.map(t => ({ price: t.price, pctChange: t.pctChange, volumeRatio: t.volumeRatio }))}
              />
            </div>
          )}
          {activeTab === 'paper-trading' && (
            <div className="space-y-4">
              <PaperTrader
                rules={engine.miningResult.rules}
                latestTicks={engine.latestTicks}
              />
            </div>
          )}
          {activeTab === 'shock-replay' && (
            <div className="space-y-4">
              <ShockReplayAlerts
                latestTicks={engine.latestTicks}
                rules={engine.miningResult.rules}
                onReplayShockTicks={engine.replayShockTicks}
              />
            </div>
          )}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <LeadLagBenchmark
                leadLagEnabled={engine.leadLagEnabled}
                onToggleLeadLag={engine.setLeadLagEnabled}
                fpGrowthRuntimeMs={engine.miningResult.fpGrowthRuntimeMs ?? 0.8}
                aprioriRuntimeMs={engine.miningResult.aprioriRuntimeMs ?? 2.7}
                frequentItemsetsCount={engine.miningResult.frequentItemsetsCount}
              />
              <NewsSentimentInjector
                onInjectNewsTag={engine.injectNewsTag}
                injectedNewsHistory={engine.injectedNews}
              />
              <Card className="p-1.5"><div className="flex flex-wrap gap-1">{([
                ['graph', 'Rule Graph'], ['rules', 'Rules Table'], ['engine', 'Mining Engine'],
              ] as const).map(([value, label]) => <button key={value} onClick={() => setRulesSubTab(value)} className={`px-3 py-2 rounded-md text-xs font-semibold ${rulesSubTab === value ? 'bg-[#1F2937] text-white' : 'text-[#9CA3AF]'}`}>{label}</button>)}</div></Card>
              {rulesSubTab === 'graph' && <RuleExplorer rules={engine.miningResult.rules} runtimeMs={engine.miningResult.runtimeMs} config={engine.miningConfig} setConfig={engine.setMiningConfig} />}
              {rulesSubTab === 'rules' && <Card className="p-5"><div className="divide-y divide-[#1F2937]">{engine.miningResult.rules.map((rule) => <div key={rule.id} className="grid md:grid-cols-[1fr_90px_100px_80px] gap-3 py-3 text-xs items-center"><div>{rule.antecedent.join(' + ')} <span className="text-[#818CF8]">→</span> {rule.consequent.join(' + ')}</div><span>Support {rule.support.toFixed(3)}</span><span>Confidence {rule.confidence.toFixed(3)}</span><span className="text-[#10B981] font-bold">Lift {rule.lift.toFixed(2)}</span></div>)}</div></Card>}
              {rulesSubTab === 'engine' && <Card className="p-5"><div className="grid md:grid-cols-2 gap-6"><RuleExplorer rules={[]} runtimeMs={engine.miningResult.runtimeMs} config={engine.miningConfig} setConfig={engine.setMiningConfig} /><Card className="p-5"><h3 className="text-sm font-semibold">Engine Metrics</h3><div className="mt-4 space-y-3 text-xs"><div className="flex justify-between"><span className="text-[#9CA3AF]">Frequent itemsets</span><span className="tabular-nums">{engine.miningResult.frequentItemsetsCount}</span></div><div className="flex justify-between"><span className="text-[#9CA3AF]">Discovered rules</span><span className="tabular-nums">{engine.miningResult.rules.length}</span></div><div className="flex justify-between"><span className="text-[#9CA3AF]">Runtime</span><span className="tabular-nums">{engine.miningResult.runtimeMs} ms</span></div></div></Card></div></Card>}
            </div>
          )}
        </div>
      </section>
        </>
      )}
      <FinnhubModal
        open={finnhubOpen}
        onClose={() => setFinnhubOpen(false)}
        setMode={enterFinnhub}
        status={engine.finnhubStatus}
      />
      {/* Slide-Over Decision Drawer */}
      <StockDecisionDrawer
        symbol={decisionDrawerStock}
        onClose={() => setDecisionDrawerStock(null)}
        latestTicks={engine.latestTicks}
        rules={engine.miningResult.rules}
        mode={engine.mode}
      />
    </div>
  );
}
