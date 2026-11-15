export function formatCount(n: number): string {
  const fmt = (v: number, suffix: string) => `${v.toFixed(1).replace(/\.0$/, '')}${suffix}`;
  if (n >= 1_000_000) return fmt(n / 1_000_000, 'M');
  if (n >= 1_000) return fmt(n / 1_000, 'k');
  return Math.round(n).toString();
}
