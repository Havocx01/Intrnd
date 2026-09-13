// Free access uses the first saved recommendation without reordering the ranking.

export type StarterCandidate = { id: string };

export function pickFreeStarterId<T extends StarterCandidate>(candidates: readonly T[]): string | null {
  return candidates[0]?.id ?? null;
}
