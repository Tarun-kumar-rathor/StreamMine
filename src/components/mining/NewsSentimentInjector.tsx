import React, { useState } from 'react';
import { Newspaper, Send, Plus, CheckCircle2, Flame, Info } from 'lucide-react';
import { Card, Badge, Button } from '../ui/Primitives';

interface NewsSentimentInjectorProps {
  onInjectNewsTag: (tag: string) => void;
  injectedNewsHistory: string[];
}

const PRESET_NEWS_EVENTS = [
  { tag: 'FED_RATE_HIKE_50BPS', label: 'Fed Raises Rates +50 bps', sentiment: 'Bearish', category: 'Macro' },
  { tag: 'FED_DOVISH_PIVOT', label: 'Fed Signals Dovish Pivot', sentiment: 'Bullish', category: 'Macro' },
  { tag: 'TECH_EARNINGS_BEAT', label: 'Big Tech Q4 Earnings Massive Beat', sentiment: 'Bullish', category: 'Corporate' },
  { tag: 'CHIP_EXPORT_SANCTIONS', label: 'Semiconductor Export Restrictions', sentiment: 'Bearish', category: 'Geopolitical' },
  { tag: 'OIL_SUPPLY_SHOCK', label: 'OPEC Unexpected Supply Cut', sentiment: 'Shock', category: 'Energy' },
  { tag: 'INFLATION_COOLING_BEAT', label: 'CPI Cools Beyond Consensus', sentiment: 'Bullish', category: 'Macro' },
];

export function NewsSentimentInjector({ onInjectNewsTag, injectedNewsHistory }: NewsSentimentInjectorProps) {
  const [customTag, setCustomTag] = useState('');
  const [lastInjected, setLastInjected] = useState<string | null>(null);

  const handleInject = (tag: string) => {
    onInjectNewsTag(tag);
    setLastInjected(tag);
    setTimeout(() => setLastInjected(null), 2500);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTag.trim()) return;
    const formatted = customTag.trim().toUpperCase().replace(/\s+/g, '_');
    handleInject(formatted);
    setCustomTag('');
  };

  return (
    <Card className="p-5 bg-[#111827] border-[#1F2937] space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#6366F1]/10 text-[#6366F1]">
            <Newspaper className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[#F9FAFB]">Macro News & Sentiment Injector</h4>
            <p className="text-xs text-[#9CA3AF]">
              Inject external qualitative macroeconomic tags directly into sliding-window transaction baskets.
            </p>
          </div>
        </div>

        {lastInjected && (
          <div className="flex items-center gap-1.5 text-xs text-[#10B981] font-mono animate-pulse">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Injected: {lastInjected}</span>
          </div>
        )}
      </div>

      {/* Preset Events */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {PRESET_NEWS_EVENTS.map((item) => (
          <button
            key={item.tag}
            type="button"
            onClick={() => handleInject(item.tag)}
            className="flex flex-col text-left p-3 rounded-lg bg-[#090D16] border border-[#1F2937] hover:border-[#6366F1]/50 hover:bg-[#111827] transition-all group"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-[11px] font-mono text-[#9CA3AF] uppercase">{item.category}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  item.sentiment === 'Bullish'
                    ? 'bg-[#10B981]/15 text-[#10B981]'
                    : item.sentiment === 'Bearish'
                    ? 'bg-[#EF4444]/15 text-[#EF4444]'
                    : 'bg-[#F59E0B]/15 text-[#F59E0B]'
                }`}
              >
                {item.sentiment}
              </span>
            </div>
            <span className="text-xs font-medium text-[#F9FAFB] group-hover:text-[#6366F1] transition-colors">
              {item.label}
            </span>
            <span className="text-[10px] font-mono text-[#6366F1] mt-1 opacity-70 group-hover:opacity-100">
              +{item.tag}
            </span>
          </button>
        ))}
      </div>

      {/* Custom Tag Input */}
      <form onSubmit={handleCustomSubmit} className="flex gap-2">
        <input
          type="text"
          value={customTag}
          onChange={(e) => setCustomTag(e.target.value)}
          placeholder="e.g. SEC_CRYPTO_ETF_APPROVAL or TSLA_ROBOTAXI_DELAY"
          className="flex-1 px-3 py-2 rounded-lg bg-[#090D16] border border-[#1F2937] text-xs text-[#F9FAFB] focus:outline-none focus:border-[#6366F1] font-mono"
        />
        <Button variant="outline" size="sm" type="submit" className="border-[#1F2937] text-[#F9FAFB] hover:border-[#6366F1]">
          <Plus className="w-3.5 h-3.5 mr-1" />
          Inject Tag
        </Button>
      </form>

      {/* Injected History */}
      {injectedNewsHistory.length > 0 && (
        <div className="pt-2 border-t border-[#1F2937]/50 flex items-center gap-2 overflow-x-auto text-xs font-mono">
          <span className="text-[11px] text-[#9CA3AF] shrink-0">Recent in Window:</span>
          {injectedNewsHistory.slice(-5).map((tag, idx) => (
            <Badge key={idx} variant="indigo" className="text-[10px] py-0.5">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}
