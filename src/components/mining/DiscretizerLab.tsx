import React from 'react';
import { DiscretizerConfig, StockTick, TransactionBasket } from '../../types/marketMining';
import { Badge, Card, SliderControl } from '../ui/Primitives';

export const DiscretizerLab: React.FC<{ config: DiscretizerConfig; setConfig: React.Dispatch<React.SetStateAction<DiscretizerConfig>>; baskets: TransactionBasket[]; openWindowTicks: StockTick[] }> =
({ config, setConfig, baskets, openWindowTicks }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
    <Card className="p-5 space-y-5"><div><h3 className="text-base font-semibold">Discretization Parameters</h3><p className="text-xs text-[#9CA3AF] mt-1">Adjust thresholds to recompute rolling baskets.</p></div>
      <SliderControl label="Price Change Threshold" value={config.priceThreshold} min={0.02} max={2.5} step={0.02} suffix="%" onChange={(value) => setConfig((current) => ({ ...current, priceThreshold: value }))} />
      <SliderControl label="Volume Spike Multiplier" value={config.volumeMultiplier} min={1.1} max={3.5} step={0.1} suffix="x" onChange={(value) => setConfig((current) => ({ ...current, volumeMultiplier: value }))} />
      <SliderControl label="Sliding Window Size" value={config.windowSeconds} min={2} max={30} step={1} suffix="s" onChange={(value) => setConfig((current) => ({ ...current, windowSeconds: value }))} />
    </Card>
    <Card className="p-5"><h3 className="text-base font-semibold mb-3">Open Window Ticks</h3><div className="max-h-56 overflow-y-auto space-y-2">{openWindowTicks.slice(-30).map((tick, index) => <div key={`${tick.symbol}-${tick.timestamp}-${index}`} className="flex justify-between text-xs border-b border-[#1F2937] pb-2"><span>{tick.displaySymbol}</span><span className={tick.pctChange >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}>{tick.pctChange.toFixed(2)}%</span></div>)}</div></Card>
    <Card className="p-5"><h3 className="text-base font-semibold mb-3">Rolling Baskets</h3><div className="max-h-56 overflow-y-auto space-y-2">{baskets.slice(-20).reverse().map((basket) => <div key={basket.windowId} className="rounded-lg border border-[#1F2937] p-2"><div className="flex justify-between text-[10px] text-[#6B7280]"><span>W{basket.windowId}</span><span>{basket.rawTicks} ticks</span></div><div className="mt-2 flex flex-wrap gap-1">{basket.items.slice(0, 8).map((item) => <Badge key={item}>{item}</Badge>)}</div></div>)}</div></Card>
  </div>
);
