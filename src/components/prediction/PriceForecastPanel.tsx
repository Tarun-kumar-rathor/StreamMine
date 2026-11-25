import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ComposedChart,
} from 'recharts';
import { Sparkles, BrainCircuit, Activity, AlertTriangle, TrendingUp, TrendingDown, Cpu } from 'lucide-react';
import { Card, Badge } from '../ui/Primitives';
import { usePriceForecast } from '../../hooks/usePriceForecast';

interface PriceForecastPanelProps {
  symbol: string;
  currentPrice: number;
  activeLift: number;
  recentTicks?: Array<{ price: number; pctChange: number; volumeRatio: number }>;
}

export function PriceForecastPanel({
  symbol,
  currentPrice,
  activeLift,
  recentTicks = [],
}: PriceForecastPanelProps) {
  const { forecast, isConnected, history } = usePriceForecast(symbol, currentPrice, activeLift, recentTicks);

  const bullish = (forecast?.bullishConfidence ?? 0.5) >= 0.5;
  const isUp = (forecast?.predictedDeltaPct ?? 0) >= 0;

  // Transform history data for Recharts
  const chartData = useMemo(() => {
    return history.map((h) => ({
      time: h.time,
      actual: h.actual,
      base: h.base,
      adjusted: h.adjusted,
      upperBand: Number((h.adjusted * 1.006).toFixed(2)),
      lowerBand: Number((h.adjusted * 0.994).toFixed(2)),
    }));
  }, [history]);

  // Dynamic Y-Domain to prevent graph distortion
  const yDomain = useMemo(() => {
    if (!chartData.length) return ['auto', 'auto'];
    const prices = chartData.flatMap((d) => [d.actual, d.base, d.adjusted]).filter(Boolean);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.25 || (min * 0.005) || 1;
    return [Number((min - padding).toFixed(2)), Number((max + padding).toFixed(2))];
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-[#1F2937] bg-[#111827]/95 p-3 shadow-xl backdrop-blur-md text-xs font-mono">
          <div className="text-[#9CA3AF] mb-1.5">{label}</div>
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between gap-4 py-0.5">
              <span style={{ color: item.color }} className="font-medium">
                {item.name}:
              </span>
              <span className="text-[#F9FAFB] font-bold tabular-nums">
                ${Number(item.value).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Connection Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#111827] border border-[#1F2937]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/20">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#F9FAFB]">
                PyTorch LSTM Neural Forecaster ({symbol})
              </h3>
              <Badge tone={isConnected ? 'emerald' : 'neutral'}>
                {isConnected ? 'Python WS Live (Port 8000)' : 'Client-side Emulation'}
              </Badge>
            </div>
            <p className="text-xs text-[#9CA3AF]">
              2-layer LSTM sequence model with Association Rule Lift cross-adjustment & Recharts dynamic scaling.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone="indigo" className="tabular-nums">
            Active Rule Lift: {activeLift.toFixed(2)}x
          </Badge>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#090D16] border border-[#1F2937] text-xs text-[#9CA3AF]">
            <Cpu className="w-3.5 h-3.5 text-[#6366F1]" />
            <span>Horizon: 1-Step Ahead</span>
          </div>
        </div>
      </div>

      {/* KPI Cards: Actual vs Base AI vs Rule-Adjusted */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-[#111827] border-[#1F2937] hover:border-[#6366F1]/40 transition-colors">
          <span className="text-xs text-[#9CA3AF] uppercase font-mono tracking-wider">Current Market Price</span>
          <div className="text-2xl font-bold text-[#F9FAFB] tabular-nums mt-1 font-mono">
            ${currentPrice?.toFixed(2) ?? '---'}
          </div>
          <span className="text-xs text-[#9CA3AF]">Real-time Finnhub stream</span>
        </Card>

        <Card className="p-4 bg-[#111827] border-[#1F2937] hover:border-[#6366F1]/40 transition-colors">
          <span className="text-xs text-[#9CA3AF] uppercase font-mono tracking-wider">Raw LSTM Forecast</span>
          <div className="text-2xl font-bold text-[#6366F1] tabular-nums mt-1 font-mono">
            ${forecast?.baseForecast.toFixed(2) ?? '---'}
          </div>
          <span className="text-xs text-[#9CA3AF]">Unadjusted PyTorch output</span>
        </Card>

        <Card className="p-4 bg-[#111827] border-[#1F2937] hover:border-[#6366F1]/40 transition-colors">
          <span className="text-xs text-[#9CA3AF] uppercase font-mono tracking-wider">Rule-Adjusted Price</span>
          <div className={`text-2xl font-bold tabular-nums mt-1 font-mono ${isUp ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
            ${forecast?.ruleAdjustedForecast.toFixed(2) ?? '---'}
          </div>
          <div className="flex items-center gap-1 text-xs">
            {isUp ? <TrendingUp className="w-3.5 h-3.5 text-[#10B981]" /> : <TrendingDown className="w-3.5 h-3.5 text-[#EF4444]" />}
            <span className={isUp ? 'text-[#10B981]' : 'text-[#EF4444]'}>
              {forecast?.predictedDeltaPct ? `${forecast.predictedDeltaPct > 0 ? '+' : ''}${forecast.predictedDeltaPct}%` : '---'}
            </span>
            <span className="text-[#9CA3AF]">via Lift {activeLift.toFixed(2)}x</span>
          </div>
        </Card>

        <Card className="p-4 bg-[#111827] border-[#1F2937] hover:border-[#6366F1]/40 transition-colors">
          <span className="text-xs text-[#9CA3AF] uppercase font-mono tracking-wider">Directional Confidence</span>
          <div className="text-2xl font-bold tabular-nums mt-1 text-[#F9FAFB] font-mono">
            {forecast ? `${(forecast.bullishConfidence * 100).toFixed(1)}%` : '---'}
          </div>
          <div className="flex items-center gap-1 text-xs mt-0.5">
            <span className={`font-medium ${bullish ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
              {bullish ? 'Bullish Probability' : 'Bearish Probability'}
            </span>
          </div>
        </Card>
      </div>

      {/* Actual vs Forecast Waveform Chart using Recharts */}
      <Card className="p-5 bg-[#111827] border-[#1F2937]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h4 className="text-sm font-semibold text-[#F9FAFB] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#6366F1]" />
              Price Trajectory & Confidence Envelope
            </h4>
            <p className="text-xs text-[#9CA3AF]">
              Actual vs. Base LSTM vs. Rule-Adjusted trajectory plotted accurately with Recharts
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-[#F9FAFB]">
              <span className="w-3 h-0.5 bg-white inline-block rounded" /> Actual
            </span>
            <span className="flex items-center gap-1.5 text-[#6366F1]">
              <span className="w-3 h-0.5 bg-[#6366F1] inline-block rounded" /> Base LSTM
            </span>
            <span className="flex items-center gap-1.5 text-[#10B981]">
              <span className="w-3 h-0.5 bg-[#10B981] inline-block rounded" /> Rule-Adjusted
            </span>
          </div>
        </div>

        {/* Dynamic Recharts Visualization */}
        <div className="h-52 w-full rounded-xl bg-[#090D16] border border-[#1F2937] p-2">
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
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
                  tickFormatter={(v) => `$${v.toFixed(2)}`}
                  tickLine={false}
                  axisLine={{ stroke: '#1F2937' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual Price"
                  stroke="#F9FAFB"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="base"
                  name="Base LSTM"
                  stroke="#6366F1"
                  strokeWidth={1.8}
                  strokeDasharray="4 3"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="adjusted"
                  name="Rule-Adjusted"
                  stroke="#10B981"
                  strokeWidth={2.2}
                  dot={{ r: 3, fill: '#10B981' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-[#9CA3AF] font-mono">
              Accumulating price ticks for waveform trajectory...
            </div>
          )}
        </div>

        {/* Accuracy and Bounds footer */}
        {forecast && (
          <div className="flex justify-between items-center px-2 pt-3 border-t border-[#1F2937] text-[11px] font-mono text-[#9CA3AF] mt-3">
            <span>Lower 1σ Band: ${forecast.lowerBand.toFixed(2)}</span>
            <span>RMSE: {forecast.metrics.rmse} | MAE: {forecast.metrics.mae}</span>
            <span>Upper 1σ Band: ${forecast.upperBand.toFixed(2)}</span>
          </div>
        )}
      </Card>

      {/* Educational & Risk Disclaimer */}
      <div className="flex items-start gap-3 p-3.5 rounded-lg bg-[#111827] border border-[#1F2937] text-xs text-[#9CA3AF]">
        <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#F59E0B]">Educational & Research Disclaimer: </span>
          Deep learning models and association rule lift heuristics are statistical indicators intended strictly for quantitative research, backtesting, and academic demonstration. Market microstructure, slippage, and non-stationarity mean past sequences cannot guarantee future financial returns.
        </div>
      </div>
    </div>
  );
}
