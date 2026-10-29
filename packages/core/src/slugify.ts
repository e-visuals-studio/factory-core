const SPECIAL: Record<string, string> = { đ: 'd', Đ: 'd', ß: 'ss', æ: 'ae', ø: 'o', œ: 'oe', ł: 'l' };

/** Lep URL slug: šumniki → s, c, z; vse ostalo v male črke, ločeno z `-`. */
export function slugify(input: string): string {
  return input
    .replace(/[đĐßæøœł]/g, (ch) => SPECIAL[ch])
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
