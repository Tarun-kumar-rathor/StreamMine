import React, { useMemo, useState } from 'react';
import { ArrowRight, CircleHelp, Search } from 'lucide-react';
import { AssociationRule, MiningConfig } from '../../types/marketMining';
import { Badge, Card, SliderControl } from '../ui/Primitives';

export const RuleExplorer: React.FC<{ rules: AssociationRule[]; runtimeMs: number; config: MiningConfig; setConfig: React.Dispatch<React.SetStateAction<MiningConfig>> }> =
({ rules, runtimeMs, config, setConfig }) => {
  const [search, setSearch] = useState('');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showGraphInfo, setShowGraphInfo] = useState(false);
  const [showMiningInfo, setShowMiningInfo] = useState(false);
  const filteredRules = useMemo(() => rules.filter((rule) => {
    const query = search.trim().toLowerCase();
    return !query || [...rule.antecedent, ...rule.consequent].some((item) => item.toLowerCase().includes(query));
  }), [rules, search]);
  const graphData = useMemo(() => {
    const top = filteredRules.slice(0, 14);
    const nodeSet = new Set<string>();
    top.forEach((rule) => {
      rule.antecedent.forEach((item) => nodeSet.add(item));
      rule.consequent.forEach((item) => nodeSet.add(item));
    });
    const nodes = Array.from(nodeSet).map((id, index, items) => {
      const angle = (index / Math.max(1, items.length)) * Math.PI * 2 - Math.PI / 2;
      return { id, x: 220 + Math.cos(angle) * 145, y: 170 + Math.sin(angle) * 125 };
    });
    return { nodes, edges: top };
  }, [filteredRules]);
  return <div className="space-y-5"><div className="grid grid-cols-1 2xl:grid-cols-[280px_1fr_260px] gap-4">
    <Card className="relative p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold">Mining Engine</h3>
          <button
            type="button"
            aria-label="Explain the mining engine"
            aria-expanded={showMiningInfo}
            onClick={() => setShowMiningInfo((current) => !current)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#1F2937] text-[#9CA3AF] transition hover:border-[#6366F1] hover:text-[#818CF8]"
          >
            <CircleHelp className="h-4 w-4" />
          </button>
        </div>
        <span className="text-xs tabular-nums text-[#10B981]">{runtimeMs} ms</span>
      </div>
      {showMiningInfo && (
        <div className="absolute left-5 right-5 top-14 z-20 rounded-xl border border-[#1F2937] bg-[#111827] p-4 text-xs leading-5 text-[#D1D5DB] shadow-xl">
          <div className="font-semibold text-white">What does the Mining Engine do?</div>
          <p className="mt-2">It examines rolling market signal baskets and finds combinations that frequently occur together.</p>
          <p className="mt-2"><span className="font-semibold text-[#818CF8]">FP-Growth</span> efficiently finds frequent stock-signal patterns. <span className="font-semibold text-[#818CF8]">Apriori</span> checks pattern combinations step by step.</p>
          <p className="mt-2"><span className="font-semibold text-[#818CF8]">Support</span> is how often a pattern appears, <span className="font-semibold text-[#818CF8]">Confidence</span> is how reliably it leads to the next movement, and <span className="font-semibold text-[#818CF8]">Lift</span> shows whether it is stronger than chance.</p>
          <p className="mt-2 text-[#9CA3AF]">The minimum settings act as filters: patterns that do not meet all thresholds are excluded from the live rule graph.</p>
        </div>
      )}
      <select value={config.algorithm} onChange={(e) => setConfig((current) => ({ ...current, algorithm: e.target.value as MiningConfig['algorithm'] }))} className="w-full px-3 py-2 rounded-lg bg-[#090D16] border border-[#1F2937]"><option>FP-Growth</option><option>Apriori</option></select>
      <SliderControl label="Minimum Support" value={config.minSupport} min={0.05} max={0.8} step={0.01} onChange={(value) => setConfig((current) => ({ ...current, minSupport: value }))} />
      <SliderControl label="Minimum Confidence" value={config.minConfidence} min={0.2} max={1} step={0.01} onChange={(value) => setConfig((current) => ({ ...current, minConfidence: value }))} />
      <SliderControl label="Minimum Lift" value={config.minLift} min={0.5} max={3} step={0.05} onChange={(value) => setConfig((current) => ({ ...current, minLift: value }))} />
    </Card>
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">Co-Movement Rule Graph</h3>
        <div className="relative flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-4 h-4 text-[#6B7280]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search symbol" className="pl-8 pr-3 py-1.5 rounded-lg bg-[#090D16] border border-[#1F2937] text-xs" />
          </div>
          <button
            type="button"
            aria-label="What is the Co-Movement Rule Graph?"
            aria-expanded={showGraphInfo}
            onClick={() => setShowGraphInfo((current) => !current)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#1F2937] text-[#9CA3AF] transition hover:border-[#6366F1] hover:text-[#818CF8]"
          >
            <CircleHelp className="h-4 w-4" />
          </button>
          {showGraphInfo && (
            <div className="absolute right-0 top-10 z-20 max-h-[70vh] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-xl border border-[#1F2937] bg-[#111827] p-4 text-xs leading-5 text-[#D1D5DB] shadow-xl">
              <div className="font-semibold text-white">What is the Co-Movement Rule Graph?</div>
              <p className="mt-2">The Co-Movement Graph shows which stocks tend to move together.</p>
              <p className="mt-2">Each circle represents a stock or market signal. An arrow means one movement tends to happen with another.</p>
              <p className="mt-2">Thicker, brighter lines indicate stronger relationships. Dashed lines indicate weaker or emerging patterns.</p>
              <p className="mt-2"><span className="font-semibold text-[#818CF8]">Lift</span> shows how much stronger the relationship is than random chance. <span className="font-semibold text-[#818CF8]">Confidence</span> shows how often the second movement follows the first. <span className="font-semibold text-[#818CF8]">Support</span> shows how frequently the pattern appears overall.</p>
              <div className="mt-3 rounded-lg bg-[#090D16] p-3 font-mono text-[10px] leading-5 text-[#D1D5DB]">
                <div className="font-sans font-semibold text-white">How the rule is measured</div>
                <div className="mt-1">Support(A → B) = count(A and B) / total baskets</div>
                <div>Confidence(A → B) = count(A and B) / count(A)</div>
                <div>Lift(A → B) = Confidence(A → B) / Support(B)</div>
              </div>
              <p className="mt-2 text-[#9CA3AF]">Example: AAPL_UP → MSFT_UP means Apple rising is often associated with Microsoft rising. It does not prove that Apple caused Microsoft to move.</p>
            </div>
          )}
        </div>
      </div>
      <svg viewBox="0 0 440 340" className="w-full h-[420px] min-h-[340px] bg-[#090D16] rounded-lg border border-[#1F2937]">
        {graphData.edges.map((edge) => {
          const from = graphData.nodes.find((node) => edge.antecedent.includes(node.id));
          const to = graphData.nodes.find((node) => edge.consequent.includes(node.id));
          if (!from || !to) return null;
          return <line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#6366F1" strokeOpacity={Math.min(0.9, edge.confidence)} strokeWidth={1 + edge.lift * 0.45} markerEnd="url(#arrow)" />;
        })}
        <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#818CF8" /></marker></defs>
        {graphData.nodes.map((node) => <g key={node.id} onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)} className="cursor-pointer"><circle cx={node.x} cy={node.y} r={selectedNode === node.id ? 28 : 23} fill={selectedNode === node.id ? '#6366F1' : '#111827'} stroke="#6366F1" /><text x={node.x} y={node.y + 4} textAnchor="middle" className="fill-white text-[9px] font-mono">{node.id.replace(/_(UP|DOWN|HighVol)$/, '')}</text></g>)}
      </svg>
    </Card>
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3">Top Association Rules</h3>
      <div className="max-h-[420px] overflow-y-auto divide-y divide-[#1F2937]">
        {filteredRules.slice(0, 30).map((rule) => (
          <button key={rule.id} onClick={() => setSelectedNode(rule.antecedent[0] ?? null)} className="w-full py-3 text-left hover:bg-[#1F2937]/50 px-1">
            <div className="flex items-center justify-between gap-2">
              <Badge tone={rule.stability === 'Stable' ? 'emerald' : rule.stability === 'Emerging' ? 'amber' : 'crimson'}>{rule.stability}</Badge>
              <span className="text-xs font-bold tabular-nums text-[#10B981]">{rule.lift.toFixed(2)} lift</span>
            </div>
            <div className="mt-2 text-xs leading-relaxed">
              {rule.antecedent.join(' + ')} <ArrowRight className="inline w-3 h-3 text-[#818CF8]" /> {rule.consequent.join(' + ')}
            </div>
            <div className="mt-2 grid grid-cols-2 text-[10px] text-[#9CA3AF] tabular-nums">
              <span>Support {rule.support.toFixed(3)}</span>
              <span className="text-right">Confidence {rule.confidence.toFixed(3)}</span>
            </div>
          </button>
        ))}
      </div>
    </Card>
  </div></div>;
};
