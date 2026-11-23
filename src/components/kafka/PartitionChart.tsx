import React from 'react';
import { KafkaMessage } from '../../types/marketMining';
import { Card } from '../ui/Primitives';

export const PartitionChart: React.FC<{ logs: KafkaMessage[] }> = ({ logs }) => {
  const counts = [0, 0, 0];
  logs.forEach((message) => counts[message.partition]++);
  const max = Math.max(1, ...counts);
  return <Card className="p-4"><h3 className="text-sm font-semibold mb-3">Kafka Partition Load Distribution</h3><div className="space-y-3">{counts.map((count, partition) => <div key={partition} className="space-y-1"><div className="flex justify-between text-xs tabular-nums"><span className="text-[#9CA3AF]">Partition {partition}</span><span>{count} msgs</span></div><div className="h-2 rounded-full bg-[#090D16] overflow-hidden border border-[#1F2937]"><div className="h-full bg-[#6366F1]" style={{ width: `${(count / max) * 100}%` }} /></div></div>)}</div></Card>;
};
