import React from 'react';
import { Activity, Layers, Sparkles } from 'lucide-react';
import { Card } from '../ui/Primitives';

export const KpiMetricCards: React.FC<{ eventsProcessed: number; activeWindows: number; strongRulesCount: number; runtimeMs: number }> =
({ eventsProcessed, activeWindows, strongRulesCount, runtimeMs }) => {
  const items = [
    { label: 'Events Processed', value: eventsProcessed.toLocaleString(), sub: 'Across P0, P1, P2', icon: Activity, accent: 'text-[#6366F1]', glow: 'hover:border-[#6366F1]/50' },
    { label: 'Sliding Windows', value: `${activeWindows} / 100`, sub: `Miner: ${runtimeMs} ms`, icon: Layers, accent: 'text-[#818CF8]', glow: 'hover:border-[#818CF8]/50' },
    { label: 'Rules (Lift > 1.2)', value: strongRulesCount.toString(), sub: 'Live statistically lifted', icon: Sparkles, accent: 'text-[#10B981]', glow: 'hover:border-[#10B981]/50' },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {items.map(({ label, value, sub, icon: Icon, accent, glow }) => (
        <Card key={label} className={`p-5 bg-[#111827]/90 border-[#1F2937] ${glow} transition-all duration-300 relative overflow-hidden group`}>
          <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#6366F1]/10 rounded-full blur-xl group-hover:bg-[#6366F1]/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-[#9CA3AF] uppercase tracking-wider">{label}</span>
            <div className="p-2 rounded-lg bg-[#090D16] border border-[#1F2937] group-hover:border-[#6366F1]/40 transition-colors">
              <Icon className={`w-4 h-4 ${accent}`} />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#F9FAFB] font-mono tabular-nums tracking-tight">
            {value}
          </div>
          <div className="mt-1 text-xs text-[#9CA3AF] font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            {sub}
          </div>
        </Card>
      ))}
    </div>
  );
};
