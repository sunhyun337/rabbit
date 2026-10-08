import type { ReactNode } from "react";

/**
 * 줄거리 본문에서 '모르는 단어'에 밑줄을 치고, 마우스를 올리면 뜻을 보여준다.
 * 단어는 사전형(예: "다스리다")이라 본문의 활용형("다스리던")과 어간으로 매칭한다.
 */
function candidates(word: string): string[] {
  const list: string[] = [word];
  if (word.endsWith("다")) list.push(word.slice(0, -1));
  const parts = word.split(/\s+/);
  const lastTok = parts[parts.length - 1].replace(/[-()·ㄱ-ㅎ]/g, "");
  if (lastTok) {
    list.push(lastTok);
    if (lastTok.endsWith("다")) list.push(lastTok.slice(0, -1));
  }
  // 2글자 이상만(너무 짧은 매칭 방지), 중복 제거
  return [...new Set(list.filter((c) => c.length >= 2))];
}

export function renderGlossed(
  text: string,
  words: [string, string][],
): ReactNode[] {
  const matches: { start: number; end: number; meaning: string }[] = [];
  for (const [w, meaning] of words) {
    for (const cand of candidates(w)) {
      const i = text.indexOf(cand);
      if (i >= 0) {
        matches.push({ start: i, end: i + cand.length, meaning });
        break;
      }
    }
  }
  matches.sort((a, b) => a.start - b.start);

  // 겹치는 구간 제거
  const kept: typeof matches = [];
  let lastEnd = -1;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      kept.push(m);
      lastEnd = m.end;
    }
  }

  const nodes: ReactNode[] = [];
  let pos = 0;
  kept.forEach((m, idx) => {
    if (m.start > pos) nodes.push(text.slice(pos, m.start));
    nodes.push(
      <span key={idx} className="gloss" title={m.meaning} tabIndex={0}>
        {text.slice(m.start, m.end)}
      </span>,
    );
    pos = m.end;
  });
  if (pos < text.length) nodes.push(text.slice(pos));
  return nodes;
}
