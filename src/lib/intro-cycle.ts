export interface IntroHistory {
  version: 1;
  seen: string[];
  last: string | null;
}

export const introKey = (text: string) => text.replace(/\s+/g, ' ').trim();

// Keep history by text rather than position so edits, reordering, and new lines
// do not reset the visitor's progress through the remaining options.
export function nextIntro(
  texts: readonly string[],
  previous: unknown,
  random: () => number = Math.random,
): { intro: string | null; history: IntroHistory } {
  const options = [...new Set(texts.map(introKey).filter(Boolean))];
  const known = new Set(options);
  const saved = previous && typeof previous === 'object' && 'version' in previous && previous.version === 1
    ? previous as Partial<IntroHistory>
    : {};
  let seen = Array.isArray(saved.seen)
    ? [...new Set(saved.seen.filter((text): text is string => typeof text === 'string' && known.has(text)))]
    : [];
  const last = typeof saved.last === 'string' && known.has(saved.last) ? saved.last : null;
  let remaining = options.filter((text) => !seen.includes(text));
  if (remaining.length === 0) {
    seen = [];
    remaining = options;
  }
  // The final line of one round must not immediately open the next round.
  const candidates = remaining.length > 1 ? remaining.filter((text) => text !== last) : remaining;
  const intro = candidates[Math.floor(random() * candidates.length)] ?? null;
  return {
    intro,
    history: { version: 1, seen: intro ? [...seen, intro] : seen, last: intro },
  };
}
