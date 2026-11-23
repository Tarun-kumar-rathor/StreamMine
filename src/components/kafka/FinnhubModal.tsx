import React, { useState } from 'react';
import { Eye, EyeOff, PlugZap, X } from 'lucide-react';
import { FinnhubStatus, MarketMode } from '../../types/marketMining';

export const FinnhubModal: React.FC<{ open: boolean; onClose: () => void; mode: MarketMode; setMode: (mode: MarketMode) => void; apiKey: string; setApiKey: (key: string) => void; status: FinnhubStatus }> =
({ open, onClose, mode, setMode, apiKey, setApiKey, status }) => {
  const [draftKey, setDraftKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  if (!open) return null;
  const save = (targetMode: MarketMode) => {
    const cleaned = draftKey.trim();
    setApiKey(cleaned);
    if (cleaned) localStorage.setItem('streammine_finnhub_key', cleaned);
    setMode(targetMode);
    onClose();
  };
  return <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"><div className="w-full max-w-lg rounded-2xl border border-[#1F2937] bg-[#111827] p-6 space-y-5 shadow-2xl"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><PlugZap className="w-5 h-5 text-[#10B981]" /><h3 className="text-lg font-bold">Live Finnhub WebSocket Connector</h3></div><button onClick={onClose}><X className="w-5 h-5 text-[#9CA3AF]" /></button></div><p className="text-sm text-[#9CA3AF]">Enter a Finnhub API key for live US equities or crypto trades.</p><div className="relative"><input type={showKey ? 'text' : 'password'} value={draftKey} onChange={(e) => setDraftKey(e.target.value)} placeholder="Finnhub API key" className="w-full px-3 py-2.5 pr-10 rounded-lg bg-[#090D16] border border-[#1F2937]" /><button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-2.5 text-[#9CA3AF]">{showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div><div className="flex gap-3"><button onClick={() => save('finnhub_us')} disabled={!draftKey.trim()} className="flex-1 py-2.5 rounded-lg bg-[#6366F1] disabled:opacity-40">US Equities</button><button onClick={() => save('finnhub_crypto')} disabled={!draftKey.trim()} className="flex-1 py-2.5 rounded-lg border border-[#1F2937]">Crypto</button></div><button onClick={() => { setApiKey(''); setMode('simulator'); onClose(); }} className="w-full py-2 text-sm text-[#9CA3AF]">Use simulator instead</button><div className="text-xs text-[#6B7280]">Status: {status.message}</div></div></div>;
};
