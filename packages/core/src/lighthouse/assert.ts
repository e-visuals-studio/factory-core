import type { Aggregation, Category, CategoryAssertion } from './config.ts';

/** Ocene (0–1) ene strani po tekih, za vsako kategorijo. */
export type RunScores = Record<Category, number | null>;

export function aggregate(scores: number[], method: Aggregation): number {
  if (scores.length === 0) throw new Error('ni ocen');
  const sorted = [...scores].sort((a, b) => a - b);
  if (method === 'optimistic') return sorted[sorted.length - 1]!;
  if (method === 'pessimistic') return sorted[0]!;
  // Mediana kot pri Lighthouse CI: pri sodem številu tekov spodnja sredinska vrednost.
  return sorted[Math.floor((sorted.length - 1) / 2)]!;
}

export interface AssertionResult {
  path: string;
  category: Category;
  aggregation: Aggregation;
  score: number | null;
  minScore: number;
  passed: boolean;
}

/** Vsaka meja za vsako stran; manjkajoča ocena (Lighthouse kategorije ni izračunal) je neuspeh. */
export function evaluate(results: Map<string, RunScores[]>, assertions: CategoryAssertion[]): AssertionResult[] {
  const out: AssertionResult[] = [];
  for (const [path, runs] of results) {
    for (const { category, minScore, aggregation } of assertions) {
      const scores = runs.map((r) => r[category]);
      const score = scores.some((s) => s === null) ? null : aggregate(scores as number[], aggregation);
      out.push({ path, category, aggregation, score, minScore, passed: score !== null && score >= minScore });
    }
  }
  return out;
}
