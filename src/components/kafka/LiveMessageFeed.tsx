import React, { useMemo, useState } from 'react';
import { KafkaMessage, KafkaTopic } from '../../types/marketMining';
import { Badge, Card } from '../ui/Primitives';

export const LiveMessageFeed: React.FC<{ logs: KafkaMessage[] }> = ({ logs }) => {
  const [topicFilter, setTopicFilter] = useState<'ALL' | KafkaTopic>('ALL');
  const [tickerQuery, setTickerQuery] = useState('');
  const [pausedHover, setPausedHover] = useState(false);
  const filtered = useMemo(() => logs.filter((message) =>
    (topicFilter === 'ALL' || message.topic === topicFilter) &&
    (!tickerQuery || message.symbol.toLowerCase().includes(tickerQuery.toLowerCase()))
  ), [logs, topicFilter, tickerQuery]);
  return <Card className="p-4"><div className="flex flex-wrap items-center justify-between gap-3 mb-4"><div className="flex items-center gap-2"><h3 className="text-sm font-semibold">Live Kafka Broker Stream</h3><Badge tone={pausedHover ? 'amber' : 'emerald'}>{pausedHover ? 'Inspecting (Hover)' : `Buffered: ${logs.length}/200`}</Badge></div><div className="flex gap-2"><select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value as 'ALL' | KafkaTopic)} className="px-2 py-1.5 rounded-lg bg-[#090D16] border border-[#1F2937] text-xs"><option value="ALL">All Topics</option><option value="stock-ticks-raw">stock-ticks-raw</option><option value="discretized-events">discretized-events</option><option value="mined-rules">mined-rules</option></select><input value={tickerQuery} onChange={(e) => setTickerQuery(e.target.value)} placeholder="Filter ticker..." className="px-2.5 rounded-lg bg-[#090D16] border border-[#1F2937] text-xs w-36" /></div></div>
    <div onMouseEnter={() => setPausedHover(true)} onMouseLeave={() => setPausedHover(false)} className="max-h-72 overflow-y-auto divide-y divide-[#1F2937]">{filtered.slice(0, 100).map((message) => <div key={message.id} className="grid grid-cols-[50px_1fr_70px_60px] gap-2 py-2 text-xs tabular-nums"><span className="text-[#818CF8]">P{message.partition}</span><span className="truncate"><b>{message.symbol}</b> <span className="text-[#9CA3AF]">{message.discretized_tag || message.topic}</span></span><span>{message.price}</span><span className={message.pct_change >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}>{message.pct_change > 0 ? '+' : ''}{message.pct_change}%</span></div>)}</div>
  </Card>;
};
