import { apiUrl } from '../../constants/api'

export { apiUrl }

export function authHeaders() {
  return { 'Content-Type': 'application/json' }
}

export function withCreds(init = {}) {
  return { credentials: 'include', ...init }
}

/**
 * Fetch для админки: при 401 один раз пробует POST /auth/refresh и повторяет запрос.
 * Для FormData не выставляет Content-Type (boundary задаёт браузер).
 */
export async function adminFetch(url, init = {}) {
  const isForm = typeof FormData !== 'undefined' && init.body instanceof FormData
  const headers = { ...(init.headers || {}) }
  if (!isForm && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  const base = { ...init, credentials: 'include', headers }
  let res = await fetch(url, base)
  if (res.status === 401 && !init._retry) {
    const r2 = await fetch(apiUrl('/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(),
    })
    if (r2.ok) {
      return fetch(url, { ...init, _retry: true, credentials: 'include', headers: { ...headers } })
    }
  }
  return res
}
