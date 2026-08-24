// Deterministic date formatter (d/m/yyyy) — avoids hydration mismatches caused
// by locale-dependent toLocaleDateString() producing different output on the
// server vs the client.
export function formatDate(date: Date): string {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}
