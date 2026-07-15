const API_BASE = process.env.EXPO_PUBLIC_API_URL || '';

/**
 * Wrap an external image URL with the API proxy so the phone
 * doesn't need direct R2 access (avoids SSL/CORS issues).
 */
export function proxyImageUrl(url: string | null): string | null {
  if (!url) return null;
  // Don't double-proxy
  if (url.includes('/api/images?url=')) return url;
  return `${API_BASE}/api/images?url=${encodeURIComponent(url)}`;
}
