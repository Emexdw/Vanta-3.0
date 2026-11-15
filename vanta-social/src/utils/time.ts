export function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return 'Ahora mismo';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${Math.max(1, minutes)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

export function extractTags(text: string): string[] {
  const found = Array.from(text.matchAll(/#([\p{L}\p{N}_]+)/gu)).map((m) => m[1].toLowerCase());
  return Array.from(new Set(found)).slice(0, 10);
}
