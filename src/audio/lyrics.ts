export type LyricCue = { start: number; end?: number; text: string };
function timestamp(value: string): number {
  const parts = value.trim().replace(",", ".").split(":").map(Number);
  if (parts.length < 2 || parts.length > 3 || parts.some(n => !Number.isFinite(n) || n < 0)) return NaN;
  return parts.reduce((sum, n) => sum * 60 + n, 0);
}
export function parseLyrics(source: string): LyricCue[] {
  const text = source.replace(/^\uFEFF/, "").replace(/\r/g, "");
  const cues: LyricCue[] = [];
  if (/^WEBVTT(?:\s|$)/.test(text)) {
    for (const block of text.split(/\n\s*\n/)) {
      const lines = block.split("\n");
      const index = lines.findIndex(line => line.includes(" --> "));
      if (index < 0 || /^(NOTE|STYLE|REGION)/.test(lines[0])) continue;
      const [from, to] = lines[index].split(" --> ");
      const start = timestamp(from), end = timestamp(to.split(/\s/)[0]);
      if (Number.isFinite(start) && Number.isFinite(end) && end > start)
        cues.push({ start, end, text: lines.slice(index + 1).join("\n").replace(/<[^>]*>/g, "") });
    }
  } else {
    const offset = Number(text.match(/\[offset:([+-]?\d+)\]/i)?.[1] ?? 0) / 1000;
    for (const line of text.split("\n")) {
      const tags = [...line.matchAll(/\[(\d+:\d+(?:\.\d+)?)\]/g)];
      const content = line.replace(/\[[^\]]*\]/g, "").trim();
      for (const tag of tags) {
        const start = Math.max(0, timestamp(tag[1]) + offset);
        if (Number.isFinite(start)) cues.push({ start, text: content });
      }
    }
  }
  return cues.sort((a, b) => a.start - b.start);
}
export function activeCue(cues: LyricCue[], position: number): number {
  let lo = 0, hi = cues.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (cues[mid].start <= position) lo = mid + 1; else hi = mid;
  }
  const index = lo - 1;
  return index >= 0 && (cues[index].end === undefined || position < cues[index].end) ? index : -1;
}
