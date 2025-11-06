const sentenceDelimiter = /(?<=[.!?])\s+/;

export function sentenceSplit(text: string): string[] {
  return text
    .split(sentenceDelimiter)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function extractKeywords(text: string, limit = 8): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

export function chunkParagraphs(text: string, maxChars = 500): string[] {
  const paragraphs = text.split(/\n{2,}/).map((p) => normalizeWhitespace(p));
  const chunks: string[] = [];
  let current = '';
  for (const paragraph of paragraphs) {
    if (!paragraph) continue;
    if ((current + ' ' + paragraph).trim().length > maxChars && current) {
      chunks.push(current.trim());
      current = paragraph;
    } else {
      current = `${current} ${paragraph}`.trim();
    }
  }
  if (current) {
    chunks.push(current.trim());
  }
  return chunks;
}

export function dedupeLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of lines) {
    const key = line.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(line);
    }
  }
  return result;
}

export function sanitizeHtml(input: string): string {
  return input.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');
}
