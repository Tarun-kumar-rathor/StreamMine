import React, { useState } from 'react';
import { Activity, CheckCircle2 } from 'lucide-react';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const handleSubscribe = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.includes('@')) return;
    setSubscribed(true);
    setEmail('');
  };
  return (
    <footer className="border-t border-[#1F2937] bg-[#090D16] pt-14 pb-10 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="space-y-3">
          <div className="flex items-center gap-2"><Activity className="w-5 h-5 text-[#6366F1]" /><span className="font-display font-bold text-lg">StreamMine</span></div>
          <p className="text-sm text-[#9CA3AF]">Real-time Apache Kafka event streaming and FP-Growth / Apriori stock market association rule mining.</p>
        </div>
        <div><h4 className="text-xs font-semibold uppercase text-[#F9FAFB] mb-3">Platform</h4><ul className="space-y-2 text-sm text-[#9CA3AF]"><li><a href="#terminal">Live Quant Terminal</a></li><li><a href="#how-it-works">Kafka Architecture</a></li><li><a href="#methodology">FP-Growth vs Apriori</a></li></ul></div>
        <div><h4 className="text-xs font-semibold uppercase text-[#F9FAFB] mb-3">Resources</h4><ul className="space-y-2 text-sm text-[#9CA3AF]"><li><a href="#faq">Documentation & FAQ</a></li><li>Educational Use Only</li></ul></div>
        <div><h4 className="text-xs font-semibold uppercase text-[#F9FAFB] mb-3">Updates</h4>{subscribed ? <div className="flex items-center gap-2 text-[#10B981] text-sm"><CheckCircle2 className="w-4 h-4" /> Subscribed</div> : <form onSubmit={handleSubscribe} className="flex gap-2"><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="min-w-0 flex-1 px-3 py-2 rounded-lg bg-[#111827] border border-[#1F2937] text-sm" /><button className="px-3 rounded-lg bg-[#6366F1] text-sm">Join</button></form>}</div>
      </div>
    </footer>
  );
};
