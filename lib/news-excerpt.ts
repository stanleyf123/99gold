const EXCERPT_MAX = 180;

export function newsExcerpt(value?: string | null, maxLength = EXCERPT_MAX): string | null {
  if (!value) return null;
  const text = value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  if (text.length <= maxLength) return text;
  const slice = text.slice(0, maxLength - 1);
  const cut = slice.lastIndexOf(" ");
  return `${(cut > 72 ? slice.slice(0, cut) : slice).trimEnd()}…`;
}
