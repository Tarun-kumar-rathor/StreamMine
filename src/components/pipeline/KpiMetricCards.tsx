import React from 'react';
import { Activity, Clock, Layers, Sparkles } from 'lucide-react';
import { Card } from '../ui/Primitives';

export const KpiMetricCards: React.FC<{ eventsProcessed: number; kafkaLagMs: number; activeWindows: number; strongRulesCount: number; runtimeMs: number }> =
({ eventsProcessed, kafkaLagMs, activeWindows, strongRulesCount, runtimeMs }) => {
  const items = [
    { label: 'Events Processed', value: eventsProcessed.toLocaleString(), sub: 'Across P0, P1, P2', icon: Activity, accent: 'text-[#6366F1]' },
    { label: 'Kafka Lag (ms)', value: `${kafkaLagMs} ms`, sub: kafkaLagMs > 20 ? 'High throughput burst' : 'Nominal consumer lag', icon: Clock, accent: kafkaLagMs > 20 ? 'text-[#F59E0B]' : 'text-[#10B981]' },
    { label: 'Sliding Windows', value: `${activeWindows} / 100`, sub: `Miner: ${runtimeMs} ms`, icon: Layers, accent: 'text-[#818CF8]' },
    { label: 'Rules (Lift > 1.2)', value: strongRulesCount.toString(), sub: 'Live statistically lifted', icon: Sparkles, accent: 'text-[#10B981]' },
  ];
  return <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">{items.map(({ label, value, sub, icon: Icon, accent }) => <Card key={label} className="p-4"><div className="flex items-center justify-between"><span className="text-xs text-[#9CA3AF]">{label}</span><Icon className={`w-4 h-4 ${accent}`} /></div><div className="mt-2 text-2xl font-bold tabular-nums">{value}</div><div className="mt-1 text-[11px] text-[#6B7280]">{sub}</div></Card>)}</div>;
};
