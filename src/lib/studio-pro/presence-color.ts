export function presenceColorForUser(userId: string) {
  const palette = ["#7c3aed", "#db2777", "#0284c7", "#d97706", "#059669", "#dc2626", "#4f46e5"];
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash + userId.charCodeAt(i) * (i + 1)) % 2147483647;
  }
  return palette[hash % palette.length];
}
