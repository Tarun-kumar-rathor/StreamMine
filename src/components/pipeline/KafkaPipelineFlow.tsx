import React from 'react';
import { BellRing, Cpu, Database, Filter, Radio } from 'lucide-react';
import { AlgorithmType, MarketMode, ShockType } from '../../types/marketMining';
import { Card } from '../ui/Primitives';

export const KafkaPipelineFlow: React.FC<{ mode: MarketMode; algorithm: AlgorithmType; shock: ShockType; shockPulseKey: number }> =
({ mode, algorithm, shock, shockPulseKey }) => {
  const stages = [
    { title: mode === 'simulator' ? 'Market Producer' : 'Finnhub Live WS', sub: mode === 'simulator' ? 'Correlated Ticks' : 'Real-Time Trades', icon: Radio },
    { title: 'Apache Kafka', sub: '3 Topics • P0–P2', icon: Database },
    { title: 'Stream Discretizer', sub: 'Sliding Windows', icon: Filter },
    { title: `${algorithm} Miner`, sub: 'Support/Conf/Lift', icon: Cpu },
    { title: 'Live Rule Alerts', sub: 'Co-Movement Graph', icon: BellRing },
  ];
  return <Card key={shockPulseKey} className={`p-5 ${shock !== 'NONE' ? 'animate-shock border-[#F59E0B]/60' : ''}`}><div className="flex justify-between gap-2 mb-4"><div><h3 className="text-base font-semibold">Real-Time Kafka Ingestion & Mining Pipeline</h3><p className="text-xs text-[#9CA3AF]">Continuous event partitioning and association rule discovery</p></div><span className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#090D16] border border-[#1F2937] text-[#10B981]">{shock === 'NONE' ? 'FLOW: NOMINAL' : `SHOCKWAVE: ${shock}`}</span></div>
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">{stages.map(({ title, sub, icon: Icon }, index) => <div key={title} className="relative rounded-lg border border-[#1F2937] bg-[#090D16] p-3 text-center"><div className="mx-auto w-9 h-9 rounded-lg bg-[#6366F1]/15 border border-[#6366F1]/30 flex items-center justify-center mb-2"><Icon className="w-4 h-4 text-[#818CF8]" /></div><div className="text-xs font-semibold">{title}</div><div className="text-[10px] text-[#6B7280] mt-1">{sub}</div>{index < stages.length - 1 && <span className="hidden md:block absolute -right-3 top-1/2 text-[#6366F1]">›</span>}</div>)}</div>
  </Card>;
};
