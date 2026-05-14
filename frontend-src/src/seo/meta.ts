/**
 * Абсолютный URL для canonical / OG при относительном пути.
 */
export function toAbsoluteOgUrl(siteOrigin: string, pathOrUrl: string): string {
  if (!pathOrUrl) return siteOrigin + '/'
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl
  const p = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${siteOrigin.replace(/\/$/, '')}${p}`
}
