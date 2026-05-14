/** Базовый префикс версионированного API (совпадает с FastAPI /api/v1/*). */
export const API_BASE = '/api/v1'

/**
 * @param {string} path путь без префикса, с ведущим слэшем или без: "/leads" или "auth/me"
 */
export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${p}`
}
