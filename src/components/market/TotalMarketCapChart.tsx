import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, TrendingDown, Layers, PieChart, Activity } from 'lucide-react';
import { Card, Badge } from '../ui/Primitives';
import { StockTick, MarketMode } from '../../types/marketMining';
import { getUniverseForMode } from '../../data/stockUniverse';

interface TotalMarketCapChartProps {
  latestTicks: StockTick[];
  mode: MarketMode;
  onSelectStock: (symbol: string) => void;
  currency?: string;
}

interface MarketCapPoint {
  time: string;
  rawTime: number;
  totalCap: number; // in Billions USD
}

export function TotalMarketCapChart({
  latestTicks,
  mode,
  onSelectStock,
  currency = 'USD',
}: TotalMarketCapChartProps) {
  const [history, setHistory] = useState<MarketCapPoint[]>([]);
  const universe = useMemo(() => getUniverseForMode(mode), [mode]);

  // Compute live Total Market Cap across universe
  const currentTotalCap = useMemo(() => {
    let total = 0;
    universe.forEach((asset) => {
      const tick = latestTicks.find((t) => t.symbol === asset.symbol);
      const price = tick?.price ?? asset.basePrice;
      const shares = asset.sharesOutstanding ?? 1.0;
      total += price * shares; // Price * Billion units = Total in Billions USD
    });
    return total;
  }, [latestTicks, universe]);

  // Session initial market cap for baseline delta
  const [baselineCap, setBaselineCap] = useState<number>(currentTotalCap);

  useEffect(() => {
    if (baselineCap === 0 && currentTotalCap > 0) {
      setBaselineCap(currentTotalCap);
    }
  }, [currentTotalCap, baselineCap]);

  // Push new point into chart history buffer (max 40 points)
  useEffect(() => {
    if (currentTotalCap <= 0) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    setHistory((prev) => {
      const point: MarketCapPoint = {
        time: timeStr,
        rawTime: now.getTime(),
        totalCap: Number(currentTotalCap.toFixed(2)),
      };
      return [...prev.slice(-39), point];
    });
  }, [currentTotalCap]);

  const pctChange = baselineCap > 0 ? ((currentTotalCap - baselineCap) / baselineCap) * 100 : 0;
  const isUp = pctChange >= 0;

  // Format Billions vs Trillions
  const formatCap = (valInBillions: number) => {
    if (valInBillions >= 1000) {
      return `$${(valInBillions / 1000).toFixed(3)}T`;
    }
    return `$${valInBillions.toFixed(2)}B`;
  };

  // Dynamic Y-Domain to prevent clipping and give 100% chart accuracy
  const yDomain = useMemo(() => {
    if (!history.length) return ['auto', 'auto'];
    const caps = history.map((h) => h.totalCap);
    const min = Math.min(...caps);
    const max = Math.max(...caps);
    const spread = max - min || min * 0.005 || 1;
    const padding = spread * 0.25;
    return [Number((min - padding).toFixed(2)), Number((max + padding).toFixed(2))];
  }, [history]);

  // Custom Dark Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as MarketCapPoint;
      return (
        <div className="rounded-lg border border-[#1F2937] bg-[#111827]/95 p-3 shadow-xl backdrop-blur-md text-xs font-mono">
          <div className="text-[#9CA3AF] mb-1">{data.time}</div>
          <div className="flex items-center gap-2">
            <span className="text-[#F9FAFB] font-semibold">Total Market Cap:</span>
            <span className="text-[#6366F1] font-bold tabular-nums">{formatCap(data.totalCap)}</span>
          </div>
          <div className="text-[10px] text-[#9CA3AF] mt-1">
            Aggregated across {universe.length} live tracked instruments
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-5 bg-[#111827] border-[#1F2937] space-y-4 hover:border-[#6366F1]/30 transition-all duration-200">
      {/* 2nd-Layer Header & Live Metric Badge */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#6366F1]/15 text-[#6366F1] border border-[#6366F1]/30">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#F9FAFB] tracking-tight">
                2nd-Layer Total Market Cap
              </h3>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 text-[10px] font-mono font-bold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                LIVE COMPOSITE
              </span>
            </div>
            <p className="text-xs text-[#9CA3AF]">
              Weighted sum of all {universe.length} active assets ({mode === 'finnhub_crypto' ? 'Crypto Universe' : 'US Large-Cap & ADRs'}). Click any stock below to inspect AI Buy decision.
            </p>
          </div>
        </div>

        {/* Aggregate Value & Return */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-extrabold text-[#F9FAFB] font-mono tabular-nums tracking-tight">
              {formatCap(currentTotalCap)}
            </div>
            <div className="flex items-center justify-end gap-1 text-xs font-mono font-semibold">
              {isUp ? (
                <TrendingUp className="w-3.5 h-3.5 text-[#10B981]" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-[#EF4444]" />
              )}
              <span className={isUp ? 'text-[#10B981]' : 'text-[#EF4444]'}>
                {isUp ? '+' : ''}{pctChange.toFixed(3)}% Session
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Recharts Responsive Area Graph */}
      <div className="h-44 w-full rounded-xl bg-[#090D16] border border-[#1F2937] p-2 relative overflow-hidden">
        {history.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="marketCapGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1F2937" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#6B7280"
                tick={{ fontSize: 10, fill: '#9CA3AF', fontFamily: 'JetBrains Mono' }}
                tickLine={false}
                axisLine={{ stroke: '#1F2937' }}
              />
              <YAxis
                domain={yDomain}
                stroke="#6B7280"
                tick={{ fontSize: 10, fill: '#9CA3AF', fontFamily: 'JetBrains Mono' }}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(2)}T` : `${v.toFixed(0)}B`)}
                tickLine={false}
                axisLine={{ stroke: '#1F2937' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="totalCap"
                stroke="#6366F1"
                strokeWidth={2.2}
                fillOpacity={1}
                fill="url(#marketCapGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[#9CA3AF] font-mono">
            Connecting real-time feed and accumulating market cap trajectory...
          </div>
        )}
      </div>

      {/* Clickable Stock Pills to Trigger AI Buy/Hold Decision Drawer */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-[11px] font-mono text-[#9CA3AF]">
          <span>Tracked Instruments (Click any asset to open AI Buy Verdict & Peer Comparison):</span>
          <span>{universe.length} assets active</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {universe.map((asset) => {
            const tick = latestTicks.find((t) => t.symbol === asset.symbol);
            const price = tick?.price ?? asset.basePrice;
            const pct = tick?.pctChange ?? 0;
            const isGain = pct >= 0;

            return (
              <button
                key={asset.symbol}
                type="button"
                onClick={() => onSelectStock(asset.displaySymbol)}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#090D16] border border-[#1F2937] hover:border-[#6366F1] hover:bg-[#111827] transition-all text-xs font-mono"
              >
                <span className="font-bold text-[#F9FAFB] group-hover:text-[#6366F1] transition-colors">
                  {asset.displaySymbol}
                </span>
                <span className="text-[#9CA3AF] tabular-nums">
                  ${price < 10 ? price.toFixed(4) : price.toFixed(2)}
                </span>
                <span
                  className={`text-[10px] px-1 py-0.2 rounded font-semibold tabular-nums ${
                    isGain ? 'text-[#10B981] bg-[#10B981]/10' : 'text-[#EF4444] bg-[#EF4444]/10'
                  }`}
                >
                  {isGain ? '+' : ''}{pct.toFixed(2)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
