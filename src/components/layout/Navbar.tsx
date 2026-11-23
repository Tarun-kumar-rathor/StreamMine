import React, { useState } from 'react';
import { Activity, Menu, PlugZap, X } from 'lucide-react';
import { MarketMode } from '../../types/marketMining';

export const Navbar: React.FC<{
  mode: MarketMode;
  onOpenFinnhub: () => void;
  onHome: () => void;
  currency: 'USD' | 'INR' | 'EUR' | 'GBP';
  setCurrency: (currency: 'USD' | 'INR' | 'EUR' | 'GBP') => void;
}> = ({ mode, onOpenFinnhub, onHome, currency, setCurrency }) => {
  const [open, setOpen] = useState(false);
  const links = [['Terminal', '#terminal'], ['Market Tape', '#terminal'], ['Rule Graph', '#terminal']];
  return (
    <header className="sticky top-0 z-40 border-b border-[#1F2937] bg-[#090D16]/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button onClick={onHome} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#6366F1]/20 border border-[#6366F1]/50 flex items-center justify-center"><Activity className="w-4 h-4 text-[#6366F1]" /></div>
          <span className="font-display font-bold text-lg">Stream<span className="text-[#6366F1]">Mine</span></span>
          <BadgeStatus mode={mode} />
        </button>
        <nav className="hidden lg:flex items-center gap-6">
          {links.map(([label, href]) => <a key={href} href={href} className="text-sm text-[#9CA3AF] hover:text-white">{label}</a>)}
        </nav>
        <div className="flex items-center gap-2">
          <select
            value={currency}
            onChange={(event) => setCurrency(event.target.value as 'USD' | 'INR' | 'EUR' | 'GBP')}
            className="h-9 rounded-lg border border-[#1F2937] bg-[#FFFDF7] px-2 text-xs font-semibold outline-none"
            aria-label="Display currency"
          >
            <option value="USD">$ USD</option>
            <option value="INR">₹ INR</option>
            <option value="EUR">€ EUR</option>
            <option value="GBP">£ GBP</option>
          </select>
          <button onClick={onOpenFinnhub} className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg border border-[#1F2937] text-xs font-semibold hover:border-[#6366F1]">
            <PlugZap className="w-4 h-4 text-[#10B981]" /> Finnhub
          </button>
        </div>
        <button onClick={() => setOpen(!open)} className="lg:hidden">{open ? <X /> : <Menu />}</button>
      </div>
      {open && <div className="lg:hidden px-4 pb-4 space-y-2">{links.map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)} className="block py-2 text-sm text-[#9CA3AF]">{label}</a>)}</div>}
    </header>
  );
};

const BadgeStatus = ({ mode }: { mode: MarketMode }) => (
  <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30">
    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />{mode === 'simulator' ? 'Sim Live' : 'Finnhub WS'}
  </span>
);
