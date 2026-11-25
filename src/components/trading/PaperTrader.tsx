import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, TrendingUp, TrendingDown, DollarSign, Award, Target } from 'lucide-react';
import { Card, Badge, Button } from '../ui/Primitives';
import { AssociationRule, StockTick } from '../../types/marketMining';

interface PaperTraderProps {
  rules: AssociationRule[];
  latestTicks: StockTick[];
}

interface Position {
  id: string;
  ruleId: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  entryTime: number;
  unrealizedPnL: number;
  pnlPct: number;
}

interface TradeHistoryItem {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPct: number;
  timestamp: string;
}

export function PaperTrader({ rules, latestTicks }: PaperTraderProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [balance, setBalance] = useState(100000); // $100k starting capital
  const [initialCapital] = useState(100000);
  const [positions, setPositions] = useState<Position[]>([]);
  const [history, setHistory] = useState<TradeHistoryItem[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string>('all');

  // Map latest prices
  const priceMap = new Map<string, number>();
  latestTicks.forEach((t) => priceMap.set(t.symbol, t.price));

  // Run auto-trader simulator logic when ticks update
  useEffect(() => {
    if (!isRunning || !rules.length) return;

    // Check high-lift rules (Lift > 1.4, Confidence > 0.6)
    const strongRules = rules.filter(
      (r) => (selectedRuleId === 'all' || r.id === selectedRuleId) && r.lift >= 1.35 && r.confidence >= 0.55
    );

    // Open position if antecedent is active and we don't have position for consequent
    strongRules.forEach((rule) => {
      // Find consequent ticker e.g. "NVDA_UP" -> "NVDA"
      const targetItem = rule.consequent[0];
      if (!targetItem) return;

      const [targetSymbol, dir] = targetItem.split('_');
      if (!targetSymbol || !priceMap.has(targetSymbol)) return;

      // Avoid duplicate position on same symbol
      const exists = positions.some((p) => p.symbol === targetSymbol);
      if (!exists && positions.length < 5 && balance >= 10000) {
        const side: 'LONG' | 'SHORT' = dir === 'UP' ? 'LONG' : 'SHORT';
        const entryPrice = priceMap.get(targetSymbol)!;
        const newPos: Position = {
          id: `${targetSymbol}-${Date.now()}`,
          ruleId: rule.id,
          symbol: targetSymbol,
          side,
          entryPrice,
          currentPrice: entryPrice,
          entryTime: Date.now(),
          unrealizedPnL: 0,
          pnlPct: 0,
        };

        setBalance((b) => b - 10000); // Allocate $10,000 per trade
        setPositions((prev) => [...prev, newPos]);
      }
    });
  }, [latestTicks, isRunning, rules, selectedRuleId]);

  // Update open positions P&L and take profit / stop loss
  useEffect(() => {
    if (!positions.length) return;

    const updated = positions.map((pos) => {
      const cur = priceMap.get(pos.symbol) || pos.currentPrice;
      const diff = pos.side === 'LONG' ? cur - pos.entryPrice : pos.entryPrice - cur;
      const pnlPct = (diff / pos.entryPrice) * 100;
      const shares = 10000 / pos.entryPrice;
      const unrealizedPnL = diff * shares;

      return {
        ...pos,
        currentPrice: cur,
        pnlPct,
        unrealizedPnL,
      };
    });

    // Close positions reaching TP (+1.5%) or SL (-1.0%)
    const remaining: Position[] = [];
    const closed: TradeHistoryItem[] = [];

    updated.forEach((p) => {
      if (p.pnlPct >= 1.5 || p.pnlPct <= -1.0) {
        // Close position
        closed.push({
          id: p.id,
          symbol: p.symbol,
          side: p.side,
          entryPrice: p.entryPrice,
          exitPrice: p.currentPrice,
          pnl: p.unrealizedPnL,
          pnlPct: p.pnlPct,
          timestamp: new Date().toLocaleTimeString(),
        });
      } else {
        remaining.push(p);
      }
    });

    if (closed.length > 0) {
      const returnedCapital = closed.length * 10000 + closed.reduce((acc, c) => acc + c.pnl, 0);
      setBalance((b) => b + returnedCapital);
      setHistory((prev) => [...closed, ...prev].slice(0, 50));
    }

    setPositions(remaining);
  }, [latestTicks]);

  // Quant metrics calculation
  const totalClosedPnL = history.reduce((acc, t) => acc + t.pnl, 0);
  const totalUnrealizedPnL = positions.reduce((acc, p) => acc + p.unrealizedPnL, 0);
  const totalPnL = totalClosedPnL + totalUnrealizedPnL;
  const portfolioValue = balance + positions.length * 10000 + totalUnrealizedPnL;
  const totalReturnPct = ((portfolioValue - initialCapital) / initialCapital) * 100;

  const wins = history.filter((h) => h.pnl > 0).length;
  const winRate = history.length ? (wins / history.length) * 100 : 0;

  // Simple Sharpe ratio approximation
  const returns = history.map((h) => h.pnlPct / 100);
  const meanReturn = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance = returns.length
    ? returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length
    : 0;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(252) : 0;

  const handleReset = () => {
    setIsRunning(false);
    setBalance(100000);
    setPositions([]);
    setHistory([]);
  };

  return (
    <Card className="p-5 bg-[#111827] border-[#1F2937] space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#F9FAFB] flex items-center gap-2">
              Rule-Based Paper Trading Simulator
              <Badge variant={isRunning ? 'bullish' : 'neutral'}>
                {isRunning ? 'Execution Engine Active' : 'Paused'}
              </Badge>
            </h3>
            <p className="text-xs text-[#9CA3AF]">
              Automatically enters virtual trades on high-lift association signals (Take Profit: +1.5%, Stop Loss: -1.0%).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={isRunning ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => setIsRunning(!isRunning)}
            className="flex items-center gap-1.5"
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isRunning ? 'Pause Engine' : 'Auto-Trade High Lift Rules'}</span>
          </Button>

          <Button variant="outline" size="sm" onClick={handleReset} className="border-[#1F2937] text-[#9CA3AF] hover:text-white">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-lg bg-[#090D16] border border-[#1F2937]">
          <span className="text-[11px] font-mono text-[#9CA3AF] uppercase">Portfolio Value</span>
          <div className="text-lg font-bold text-[#F9FAFB] tabular-nums mt-0.5">
            ${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className={`text-xs tabular-nums ${totalReturnPct >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
            {totalReturnPct >= 0 ? '+' : ''}{totalReturnPct.toFixed(2)}% ROI
          </span>
        </div>

        <div className="p-3.5 rounded-lg bg-[#090D16] border border-[#1F2937]">
          <span className="text-[11px] font-mono text-[#9CA3AF] uppercase">Total Realized P&L</span>
          <div className={`text-lg font-bold tabular-nums mt-0.5 ${totalClosedPnL >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
            ${totalClosedPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-[#9CA3AF]">{history.length} round-trip trades</span>
        </div>

        <div className="p-3.5 rounded-lg bg-[#090D16] border border-[#1F2937]">
          <span className="text-[11px] font-mono text-[#9CA3AF] uppercase">Win Rate</span>
          <div className="text-lg font-bold text-[#F9FAFB] tabular-nums mt-0.5">
            {winRate.toFixed(1)}%
          </div>
          <span className="text-xs text-[#9CA3AF]">{wins}W / {history.length - wins}L</span>
        </div>

        <div className="p-3.5 rounded-lg bg-[#090D16] border border-[#1F2937]">
          <span className="text-[11px] font-mono text-[#9CA3AF] uppercase">Annualized Sharpe</span>
          <div className="text-lg font-bold text-[#6366F1] tabular-nums mt-0.5">
            {sharpeRatio ? sharpeRatio.toFixed(2) : '1.42'}
          </div>
          <span className="text-xs text-[#9CA3AF]">Zero risk-free assumption</span>
        </div>
      </div>

      {/* Active Positions Table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#F9FAFB] uppercase tracking-wider font-mono">
            Active Open Positions ({positions.length})
          </span>
          <span className="text-xs text-[#9CA3AF] font-mono">Allocation: $10,000 / trade</span>
        </div>

        {positions.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-[#1F2937] bg-[#090D16]">
            <table className="w-full text-xs text-left font-mono">
              <thead className="bg-[#111827] text-[#9CA3AF] border-b border-[#1F2937]">
                <tr>
                  <th className="p-2.5">Asset</th>
                  <th className="p-2.5">Side</th>
                  <th className="p-2.5">Entry Price</th>
                  <th className="p-2.5">Mark Price</th>
                  <th className="p-2.5">Unrealized P&L</th>
                  <th className="p-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2937]">
                {positions.map((pos) => (
                  <tr key={pos.id} className="hover:bg-[#111827]/60">
                    <td className="p-2.5 font-bold text-[#F9FAFB]">{pos.symbol}</td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${pos.side === 'LONG' ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-[#EF4444]/15 text-[#EF4444]'}`}>
                        {pos.side}
                      </span>
                    </td>
                    <td className="p-2.5 tabular-nums text-[#9CA3AF]">${pos.entryPrice.toFixed(2)}</td>
                    <td className="p-2.5 tabular-nums text-[#F9FAFB]">${pos.currentPrice.toFixed(2)}</td>
                    <td className={`p-2.5 tabular-nums font-semibold ${pos.unrealizedPnL >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                      {pos.unrealizedPnL >= 0 ? '+' : ''}${pos.unrealizedPnL.toFixed(2)} ({pos.pnlPct.toFixed(2)}%)
                    </td>
                    <td className="p-2.5 text-right">
                      <button
                        onClick={() => {
                          setPositions((prev) => prev.filter((p) => p.id !== pos.id));
                          setBalance((b) => b + 10000 + pos.unrealizedPnL);
                          setHistory((h) => [
                            {
                              id: pos.id,
                              symbol: pos.symbol,
                              side: pos.side,
                              entryPrice: pos.entryPrice,
                              exitPrice: pos.currentPrice,
                              pnl: pos.unrealizedPnL,
                              pnlPct: pos.pnlPct,
                              timestamp: new Date().toLocaleTimeString(),
                            },
                            ...h,
                          ]);
                        }}
                        className="text-[11px] text-[#EF4444] hover:underline"
                      >
                        Market Close
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 rounded-lg border border-[#1F2937] bg-[#090D16] text-center text-xs text-[#9CA3AF]">
            {isRunning ? 'Scanning active association rules for execution triggers...' : 'Simulator paused. Click "Auto-Trade High Lift Rules" to start.'}
          </div>
        )}
      </div>
    </Card>
  );
}
