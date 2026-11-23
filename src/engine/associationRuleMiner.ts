import { AssociationRule, MiningConfig, TransactionBasket } from '../types/marketMining';

export interface MiningResult {
  rules: AssociationRule[];
  runtimeMs: number;
  frequentItemsetsCount: number;
}

function key(items: string[]) {
  return [...items].sort().join('|');
}

function combinations(items: string[], size: number): string[][] {
  const result: string[][] = [];
  function visit(start: number, selected: string[]) {
    if (selected.length === size) {
      result.push([...selected]);
      return;
    }
    for (let i = start; i <= items.length - (size - selected.length); i++) {
      visit(i + 1, [...selected, items[i]]);
    }
  }
  if (size === 0) return [[]];
  visit(0, []);
  return result;
}

function mineFrequentItemsets(transactions: string[][], minCount: number) {
  const frequent = new Map<string, number>();
  const firstCounts = new Map<string, number>();
  transactions.forEach((tx) => new Set(tx).forEach((item) => firstCounts.set(item, (firstCounts.get(item) ?? 0) + 1)));
  let current = Array.from(firstCounts.entries()).filter(([, count]) => count >= minCount).map(([item]) => [item]);
  let level = 1;
  while (current.length) {
    current.forEach((set) => {
      const count = transactions.filter((tx) => set.every((item) => tx.includes(item))).length;
      if (count >= minCount) frequent.set(key(set), count);
    });
    level++;
    if (level > 4) break;
    const candidates = new Map<string, string[]>();
    for (let i = 0; i < current.length; i++) {
      for (let j = i + 1; j < current.length; j++) {
        const union = Array.from(new Set([...current[i], ...current[j]])).sort();
        if (union.length === level) candidates.set(key(union), union);
      }
    }
    current = Array.from(candidates.values()).filter((set) =>
      combinations(set, set.length - 1).every((subset) => frequent.has(key(subset)))
    );
  }
  return frequent;
}

export function mineAssociationRules(baskets: TransactionBasket[], config: MiningConfig): MiningResult {
  const started = performance.now();
  const transactions = baskets.map((basket) => basket.items).filter((items) => items.length > 0);
  const minCount = Math.max(1, Math.ceil(config.minSupport * transactions.length));
  const frequent = mineFrequentItemsets(transactions, minCount);
  const rules: AssociationRule[] = [];
  frequent.forEach((count, k) => {
    const set = k.split('|');
    if (set.length < 2) return;
    for (let split = 1; split < set.length; split++) {
      const antecedent = set.slice(0, split);
      const consequent = set.slice(split);
      const antecedentCount = transactions.filter((tx) => antecedent.every((item) => tx.includes(item))).length;
      const consequentCount = transactions.filter((tx) => consequent.every((item) => tx.includes(item))).length;
      if (!antecedentCount || !consequentCount) continue;
      const support = count / transactions.length;
      const confidence = count / antecedentCount;
      const lift = confidence / (consequentCount / transactions.length);
      if (support >= config.minSupport && confidence >= config.minConfidence && lift >= config.minLift) {
        const stability = lift > 1.8 && confidence > 0.75 ? 'Stable' : lift > 1.35 ? 'Emerging' : 'Volatile';
        rules.push({
          id: `${key(antecedent)}=>${key(consequent)}-${rules.length}`,
          antecedent,
          consequent,
          support,
          confidence,
          lift,
          stability,
          sampleCount: count,
        });
      }
    }
  });
  rules.sort((a, b) => b.lift - a.lift || b.confidence - a.confidence);
  return {
    rules: rules.slice(0, 100),
    runtimeMs: Math.round(performance.now() - started),
    frequentItemsetsCount: frequent.size,
  };
}
