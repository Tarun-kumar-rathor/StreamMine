import React, { useState } from 'react';
import { Activity, Menu, PlugZap, X } from 'lucide-react';

export const Navbar: React.FC<{
  onOpenFinnhub: () => void;
  onHome: () => void;
  currency: 'USD' | 'INR' | 'EUR' | 'GBP';
  setCurrency: (currency: 'USD' | 'INR' | 'EUR' | 'GBP') => void;
}> = ({ onOpenFinnhub, onHome, currency, setCurrency }) => {
  const [open, setOpen] = useState(false);
  const links = [['Terminal', '#terminal'], ['Market Tape', '#terminal'], ['Rule Graph', '#terminal']];
  return (
    <header className="sticky top-0 z-40 border-b border-[#1F2937]/80 bg-[#090D16]/80 backdrop-blur-2xl shadow-xl shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button onClick={onHome} className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6366F1]/30 via-[#6366F1]/10 to-transparent border border-[#6366F1]/40 flex items-center justify-center shadow-md shadow-[#6366F1]/20 group-hover:scale-105 group-hover:border-[#6366F1] transition-all">
            <Activity className="w-4 h-4 text-[#6366F1] group-hover:animate-pulse" />
          </div>
          <span className="font-display font-black text-lg tracking-tight text-[#F9FAFB] group-hover:text-white transition-colors">
            Stream<span className="text-[#6366F1]">Mine</span>
          </span>
          <BadgeStatus />
        </button>
        <nav className="hidden lg:flex items-center gap-6">
          {links.map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] hover:text-[#F9FAFB] hover:drop-shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2.5">
          <select
            value={currency}
            onChange={(event) => setCurrency(event.target.value as 'USD' | 'INR' | 'EUR' | 'GBP')}
            className="h-9 rounded-lg border border-[#1F2937] bg-[#111827] px-2.5 text-xs font-mono font-semibold text-[#F9FAFB] outline-none hover:border-[#6366F1]/50 focus:border-[#6366F1] transition-colors cursor-pointer"
            aria-label="Display currency"
          >
            <option value="USD">$ USD</option>
            <option value="INR">₹ INR</option>
            <option value="EUR">€ EUR</option>
            <option value="GBP">£ GBP</option>
          </select>
          <button
            onClick={onOpenFinnhub}
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#1F2937] bg-[#111827]/70 text-xs font-mono font-semibold text-[#F9FAFB] hover:border-[#10B981] hover:bg-[#10B981]/10 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all"
          >
            <PlugZap className="w-4 h-4 text-[#10B981]" /> Finnhub WS
          </button>
        </div>
        <button onClick={() => setOpen(!open)} className="lg:hidden text-[#9CA3AF] hover:text-[#F9FAFB]">{open ? <X /> : <Menu />}</button>
      </div>
      {open && <div className="lg:hidden px-4 pb-4 space-y-2">{links.map(([label, href]) => <a key={label} href={href} onClick={() => setOpen(false)} className="block py-2 text-sm text-[#9CA3AF]">{label}</a>)}</div>}
    </header>
  );
};

const BadgeStatus = () => (
  <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30">
    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />Finnhub WS
  </span>
);
