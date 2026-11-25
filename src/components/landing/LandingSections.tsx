import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronDown, Cpu, Database, Layers, ShieldCheck, Zap } from 'lucide-react';
import { AssociationRule, StockTick } from '../../types/marketMining';
import { Badge, Card } from '../ui/Primitives';

export const HeroSection: React.FC<{ latestTicks: StockTick[]; topRule?: AssociationRule; onOpenFinnhub: () => void }> = ({ latestTicks, topRule, onOpenFinnhub }) => (
  <section id="top" className="pt-14 pb-12 px-4 sm:px-6 max-w-7xl mx-auto">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center"><div className="lg:col-span-7 space-y-6"><Badge tone="indigo">Apache Kafka • FP-Growth • Live Finnhub WebSockets</Badge><h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Discover Real-Time Stock Co-Movements Before the Market Closes</h1><p className="text-base text-[#9CA3AF] max-w-2xl">StreamMine ingests live equity and crypto tick streams, discretizes rolling time windows, and mines statistically significant association rules on the fly.</p><div className="flex flex-wrap gap-3"><a href="#terminal" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#6366F1] text-sm font-semibold">Open Live Terminal <ArrowRight className="w-4 h-4" /></a><button onClick={onOpenFinnhub} className="px-5 py-3 rounded-xl border border-[#1F2937] bg-[#111827] text-sm font-semibold">Connect Finnhub Key</button></div></div>
      <Card className="lg:col-span-5 p-5"><div className="flex items-center justify-between mb-4"><h3 className="text-sm font-semibold">Live Market Tape</h3><Badge tone="emerald">Streaming</Badge></div><div className="space-y-2">{latestTicks.slice(0, 7).map((tick) => <div key={tick.symbol} className="grid grid-cols-3 text-xs py-2 border-b border-[#1F2937]"><span>{tick.displaySymbol}</span><span className="tabular-nums">{tick.price.toFixed(tick.price < 10 ? 4 : 2)}</span><span className={`tabular-nums text-right ${tick.pctChange >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>{tick.pctChange >= 0 ? '+' : ''}{tick.pctChange.toFixed(2)}%</span></div>)}</div>{topRule && <div className="mt-4 rounded-lg bg-[#6366F1]/10 border border-[#6366F1]/30 p-3 text-xs">Top rule: {topRule.antecedent.join(' + ')} → {topRule.consequent.join(' + ')} <b className="float-right">Lift {topRule.lift.toFixed(2)}</b></div>}</Card>
    </div>
  </section>
);

export const FeaturesAndSocialProof: React.FC = () => (
  <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-16"><div className="grid md:grid-cols-3 gap-5">{[
    ['Kafka-Style Ingestion', 'Partitioned topics and ring-buffered broker logs.', Database],
    ['Rolling Discretization', 'Configurable price and volume event windows.', Layers],
    ['Association Mining', 'FP-Growth and Apriori with support, confidence and lift.', Cpu],
  ].map(([title, copy, Icon]) => <Card key={title as string} className="p-6"><Icon className="w-5 h-5 text-[#6366F1] mb-4" /><h3 className="font-semibold">{title as string}</h3><p className="mt-2 text-sm text-[#9CA3AF]">{copy as string}</p></Card>)}</div></section>
);

export const HowItWorksAndMethodology: React.FC = () => (
  <>
    <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 py-16"><h2 className="text-2xl font-bold mb-6">How It Works</h2><div className="grid md:grid-cols-4 gap-4">{['Produce ticks', 'Hash partitions', 'Build baskets', 'Mine rules'].map((step, index) => <Card key={step} className="p-5"><span className="text-[#6366F1] font-mono text-xs">0{index + 1}</span><h3 className="mt-2 font-semibold">{step}</h3></Card>)}</div></section>
    <section id="methodology" className="max-w-7xl mx-auto px-4 sm:px-6 py-16"><Card className="p-6"><h2 className="text-xl font-bold mb-4">Methodology</h2><p className="text-sm text-[#9CA3AF]">Rules are ranked by lift, confidence and support. Stability labels indicate repeated and statistically stronger co-movement patterns.</p></Card></section>
  </>
);

export const FaqAndContact: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);
  const faqs = [
    ['Does this connect to Apache Kafka?', 'The dashboard uses a browser-side Kafka broker mock that reproduces topics, partitions and offsets.'],
    ['Does it require a Finnhub key?', 'Yes. Configure the key on the server to access live market data.'],
    ['Is this financial advice?', 'No. StreamMine is for educational and analytical use only.'],
  ];
  return <section id="faq" className="max-w-7xl mx-auto px-4 sm:px-6 py-16"><h2 className="text-2xl font-bold mb-5">FAQ</h2><div className="space-y-2">{faqs.map(([question, answer], index) => <Card key={question} className="overflow-hidden"><button onClick={() => setOpen(open === index ? null : index)} className="w-full flex justify-between items-center p-4 text-left text-sm font-semibold"><span>{question}</span><ChevronDown className={`w-4 h-4 transition ${open === index ? 'rotate-180' : ''}`} /></button>{open === index && <p className="px-4 pb-4 text-sm text-[#9CA3AF]">{answer}</p>}</Card>)}</div></section>;
};
