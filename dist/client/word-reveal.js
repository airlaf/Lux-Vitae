const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const wordProgress = new WeakMap();

export function splitWords(element) {
  const words = Array.from(element.childNodes).flatMap(node => {
    if (node.nodeType === Node.ELEMENT_NODE) return [node];
    return (node.textContent.match(/\S+/g) || []).map(text => {
      const span = document.createElement('span');
      span.textContent = text;
      return span;
    });
  });
  element.replaceChildren(...words.flatMap((word, i) => i ? [' ', word] : [word]));
  return words;
}

export function revealWords(words, readingProgress) {
  readingProgress = reducedMotion.matches ? 1 : Math.max(0, Math.min(1, readingProgress));
  if (wordProgress.get(words) === readingProgress) return;
  wordProgress.set(words, readingProgress);
  words.forEach((word, index) => {
    const start = .78 * index / Math.max(1, words.length - 1);
    const t = Math.min(1, Math.max(0, (readingProgress - start) / .22));
    word.style.opacity = reducedMotion.matches ? 1 : t * t * (3 - 2 * t);
  });
}
